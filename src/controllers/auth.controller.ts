import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AuthService } from '../services/auth.service';
import { ApiResponseUtil } from '../utils/response';
import { logger } from '../utils/logger';

const authService = new AuthService();

export class AuthController {
  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      ApiResponseUtil.created(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Debug: log incoming login email for troubleshooting
      logger.info('AuthController.login request', { email: req.body?.email });

      const result = await authService.login(req.body);
      ApiResponseUtil.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      ApiResponseUtil.success(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await authService.getProfile(userId);
      ApiResponseUtil.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      ApiResponseUtil.success(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name } = req.body;
      const result = await authService.updateProfile(userId, { name });
      ApiResponseUtil.success(res, result, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { newPassword } = req.body;
      await authService.changePassword(userId, newPassword);
      ApiResponseUtil.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}
