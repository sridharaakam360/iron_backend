import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types';

export class JwtUtil {
  static generateAccessToken(user: AuthUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: user.storeId,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRE_TIME }
    );
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRE_TIME,
    });
  }

  static verifyAccessToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static verifyRefreshToken(token: string): { id: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
