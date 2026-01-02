import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types';
import { AppError } from '../middleware/errorHandler';

export class JwtUtil {
  static generateAccessToken(user: AuthUser): string {
    if (!env.JWT_SECRET) {
      throw new AppError('JWT_SECRET is not configured', 500);
    }

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: user.storeId,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRE_TIME as any }
    );
  }

  static generateRefreshToken(userId: string): string {
    if (!env.JWT_REFRESH_SECRET) {
      throw new AppError('JWT_REFRESH_SECRET is not configured', 500);
    }

    return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRE_TIME as any,
    });
  }

  static verifyAccessToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      return decoded as AuthUser;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static verifyRefreshToken(token: string): { id: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
      return decoded as { id: string };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
