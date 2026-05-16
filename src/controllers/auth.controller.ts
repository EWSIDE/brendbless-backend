import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { authService } from '../services/auth.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

export class AuthController {
  // Register
  register = async (req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
        return;
      }

      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Login
  login = async (req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
        return;
      }

      const result = await authService.login(req.body.email, req.body.password);

      // Set cookies in production
      if (process.env.NODE_ENV === 'production') {
        res.cookie('accessToken', result.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Login successful.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Refresh tokens
  refresh = async (req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required.'
        });
        return;
      }

      const tokens = await authService.refreshToken(refreshToken);

      // Update cookies
      if (process.env.NODE_ENV === 'production') {
        res.cookie('accessToken', tokens.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
      }

      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  };

  // Logout
  logout = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.user?.id || '', refreshToken);

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get current user
  me = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.getMe(req.user!.id);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  // Update profile
  updateProfile = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.updateProfile(req.user!.id, req.body);

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Change password
  changePassword = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(req.user!.id, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Forgot password
  forgotPassword = async (req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    } catch (error) {
      next(error);
    }
  };

  // Reset password
  resetPassword = async (req: Request, res: Response<ApiResponse<unknown>>, next: NextFunction): Promise<void> => {
    try {
      const { token, email, password } = req.body;
      await authService.resetPassword(token, email, password);

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
