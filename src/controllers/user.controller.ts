import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';

export class UserController {
  // Get all users in the store (for ADMIN)
  async getStoreUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: 'Store ID not found',
        });
      }

      const users = await prisma.user.findMany({
        where: { storeId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create employee (for ADMIN)
  async createEmployee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: 'Store ID not found',
        });
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 6);

      // Create employee
      const employee = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'EMPLOYEE',
          storeId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle user status (for ADMIN)
  async toggleUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const storeId = req.user?.storeId;

      // Verify user belongs to the same store
      const user = await prisma.user.findFirst({
        where: {
          id,
          storeId,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Don't allow admin to deactivate themselves
      if (user.id === req.user?.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account',
        });
      }

      // Toggle status
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      res.json({
        success: true,
        message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete employee (for ADMIN)
  async deleteEmployee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const storeId = req.user?.storeId;

      // Verify user belongs to the same store and is an employee
      const user = await prisma.user.findFirst({
        where: {
          id,
          storeId,
          role: 'EMPLOYEE',
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
      }

      await prisma.user.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Employee deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
