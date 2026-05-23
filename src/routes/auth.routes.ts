import { Router, Request, Response } from 'express';
import { authService, extractRefreshToken } from '../services/auth.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Register - Step 1: Create user and send verification code
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Введите email и пароль' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Пароль должен содержать не менее 6 символов' });
    }
    const result = await authService.register({ email, password, firstName, lastName });
    res.status(201).json({ 
      success: true, 
      data: { 
        email: result.email,
        verificationCode: result.verificationCode,
        verificationToken: result.verificationToken
      } 
    });
  } catch (err: any) {
    console.error('Registration error:', err?.message || err);
    const message = err?.message || 'Не удалось создать аккаунт. Попробуйте позже.';
    res.status(400).json({ success: false, error: message });
  }
});

// Verify email with code - Step 2: User enters the code
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token, email, code } = req.body;
    if (!token || !email) {
      return res.status(400).json({ success: false, error: 'Token and email are required' });
    }
    
    // Проверяем код если он предоставлен
    if (code) {
      const expectedCode = token.substring(0, 6).toUpperCase();
      if (code.toUpperCase() !== expectedCode) {
        return res.status(400).json({ success: false, error: 'Неверный код подтверждения' });
      }
    }
    
    await authService.verifyEmail(token, email);
    res.json({ success: true, message: 'Email verified successfully. You can now login.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login - After verification
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Resend verification email
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    await authService.resendVerificationEmail(email);
    res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = extractRefreshToken(req) || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token is required' });
    }
    const result = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = extractRefreshToken(req) || req.body?.refreshToken;
    if (refreshToken) {
      // Try to delete the refresh token, ignore errors if token doesn't exist
      try {
        await authService.logoutByToken(refreshToken);
      } catch {}
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    // Always return success for logout
    res.json({ success: true, message: 'Logged out' });
  }
});

// Logout all devices
router.post('/logout-all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await authService.logoutAll(req.user!.userId);
    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update profile
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;
    const user = await authService.updateProfile(req.user!.userId, { firstName, lastName, phone, avatar });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Change password
router.put('/password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Forgot password - send reset email
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    await authService.forgotPassword(email);
    res.json({ success: true, message: 'Password reset instructions have been sent to your email' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token, email and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    await authService.resetPassword(token, email, newPassword);
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
