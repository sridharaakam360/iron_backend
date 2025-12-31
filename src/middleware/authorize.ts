import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from './errorHandler';

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';

export const authorize = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!roles.includes(req.user.role as UserRole)) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
};
