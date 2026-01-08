import { User, UserRole } from '../models/User';
import { Store } from '../models/Store';
import { AppError } from '../middleware/errorHandler';
import { LoginInput, RegisterInput, AuthUser } from '../types';
import { PasswordUtil } from '../utils/password';
import { JwtUtil } from '../utils/jwt';
import { logger } from '../utils/logger';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await User.findOne({
      where: { email: input.email }
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const hashedPassword = await PasswordUtil.hash(input.password);

    const user = await User.create({
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: input.role || UserRole.ADMIN,
    } as any);

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    };

    const accessToken = JwtUtil.generateAccessToken(authUser);
    const refreshToken = JwtUtil.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput) {
    try {
      const user = await User.findOne({
        where: { email: input.email },
        include: [Store]
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      if (!user.isActive) {
        throw new AppError('Account is deactivated', 403);
      }

      // Check if store is approved (for non-superadmin users)
      if (user.storeId && user.store && !user.store.isApproved) {
        throw new AppError('Store is pending approval', 403);
      }

      const isPasswordValid = await PasswordUtil.compare(input.password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as any,
        storeId: user.storeId || undefined,
      };

      const accessToken = JwtUtil.generateAccessToken(authUser);
      const refreshToken = JwtUtil.generateRefreshToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: user.storeId,
        },
        store: user.store ? {
          id: user.store.id,
          name: user.store.name,
          logoUrl: user.store.logoUrl,
          isActive: user.store.isActive,
          deactivationReason: user.store.deactivationReason,
        } : undefined,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      // Log without including sensitive info
      logger.error('AuthService.login error', { email: input?.email, error });
      throw error;
    }
  }

  async refreshToken(token: string) {
    try {
      const decoded = JwtUtil.verifyRefreshToken(token);

      const user = await User.findByPk(decoded.id);

      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401);
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as any,
        storeId: user.storeId || undefined,
      };

      const newAccessToken = JwtUtil.generateAccessToken(authUser);
      const newRefreshToken = JwtUtil.generateRefreshToken(user.id);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async getProfile(userId: string) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'name', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async updateProfile(userId: string, data: { name: string }) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.name = data.name;
    await user.save();

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async changePassword(userId: string, newPassword: string) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const hashedPassword = await PasswordUtil.hash(newPassword);
    user.password = hashedPassword;
    await user.save();

    return true;
  }
}
