import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { JwtUtil } from '../utils/jwt';
import { ApiResponseUtil } from '../utils/response';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ApiResponseUtil.unauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.substring(7);

    try {
      const user = JwtUtil.verifyAccessToken(token);
      req.user = user;
      next();
    } catch (error) {
      ApiResponseUtil.unauthorized(res, 'Invalid or expired token');
      return;
    }
  } catch (error) {
    ApiResponseUtil.serverError(res, 'Authentication failed');
  }
};

