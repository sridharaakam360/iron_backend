import { prisma } from '../config/database';
import { PasswordUtil } from '../utils/password';
import { JwtUtil } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { LoginInput, RegisterInput, AuthUser } from '../types';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const hashedPassword = await PasswordUtil.hash(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: input.role || 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = JwtUtil.generateAccessToken(authUser);
    const refreshToken = JwtUtil.generateRefreshToken(user.id);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        store: true,
      },
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
      role: user.role,
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
        isActive: user.store.isActive,
        deactivationReason: user.store.deactivationReason,
      } : undefined,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = JwtUtil.verifyRefreshToken(refreshToken);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          storeId: true,
        },
      });

      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401);
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async updateProfile(userId: string, data: { name: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const hashedPassword = await PasswordUtil.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return true;
  }
}
