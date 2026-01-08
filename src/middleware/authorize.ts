import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from './errorHandler';


export const authorize = (roles: string[] = []) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!roles.includes(req.user.role as any)) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
};
