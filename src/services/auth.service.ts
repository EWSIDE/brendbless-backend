import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload, UserRole } from '../types';
import { sendVerificationEmail } from './email.service';
import { config } from '../config/env';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'brendbless-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30');

export class AuthService {
  async register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Некорректный формат email');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'USER',
        verificationToken,
        verificationTokenExpires,
        emailVerified: false,
        updatedAt: new Date(),
      },
    });

    // Send verification email
    const frontendUrl = config.frontendUrl;
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(data.email)}`;
    
    // Generate readable verification code from token
    const verificationCode = verificationToken.substring(0, 6).toUpperCase();
    
    try {
      await sendVerificationEmail(data.email, verificationUrl);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Continue registration even if email fails
    }

    return {
      email: user.email,
      message: 'Registration successful. Please check your email to verify your account.',
      verificationCode,
      verificationToken,
    };
  }

  async verifyEmail(token: string, email: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        email,
        verificationToken: token,
        emailVerified: false,
      },
    });

    if (!user) {
      throw new Error('Неверный код подтверждения');
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      throw new Error('Срок действия кода истёк');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return true;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires,
      },
    });

    // Send verification email
    const frontendUrl = config.frontendUrl;
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    await sendVerificationEmail(email, verificationUrl);
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Неверный email или пароль');
    }

    if (!user.isActive) {
      throw new Error('Аккаунт деактивирован');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Неверный email или пароль');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { User: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new Error('Invalid or expired refresh token');
      }

      const user = storedToken.User;
      const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      const { password: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, ...tokens };
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  async logoutByToken(refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }

  async logout(userId: string, refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });
  }

  async logoutAll(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; avatar?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, avatar: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new Error('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
    await this.logoutAll(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: resetToken,
        verificationTokenExpires: resetTokenExpires,
      },
    });

    // Send reset email
    const frontendUrl = config.frontendUrl;
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    await sendVerificationEmail(email, resetUrl);
  }

  async resetPassword(token: string, email: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        email,
        verificationToken: token,
      },
    });

    if (!user) {
      throw new Error('Ссылка для сброса пароля недействительна');
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      throw new Error('Срок действия ссылки истёк');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });
    await this.logoutAll(user.id);
  }

  async updateRole(userId: string, role: UserRole, adminId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') throw new Error('Only admins can change roles');
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, avatar: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const accessToken = jwt.sign(
      { userId, email, role, type: 'access' },
      JWT_SECRET,
      { expiresIn: 7 * 24 * 60 * 60 } // 7 days in seconds
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);

    await prisma.refreshToken.create({
      data: { id: crypto.randomUUID(), userId, token, expiresAt },
    });
  }
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function extractRefreshToken(req: Request): string | null {
  const authHeader = req.headers['x-refresh-token'];
  if (typeof authHeader === 'string') return authHeader;
  if (Array.isArray(authHeader)) return authHeader[0] as string;
  return null;
}

export const authService = new AuthService();
