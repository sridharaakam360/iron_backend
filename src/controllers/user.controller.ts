import { Response, NextFunction } from 'express';
import { User, UserRole } from '../models/User';
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

      const users = await User.findAll({
        where: { storeId },
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']],
      });

      return res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      return next(error);
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
      const existingUser = await User.findOne({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create employee
      const employee = await User.create({
        name,
        email,
        password: hashedPassword,
        role: UserRole.EMPLOYEE,
        storeId,
        isActive: true,
      } as any);

      const employeeData = employee.toJSON();
      delete (employeeData as any).password;

      return res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employeeData,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Toggle user status (for ADMIN)
  async toggleUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const storeId = req.user?.storeId;

      // Verify user belongs to the same store
      const user = await User.findOne({
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
      user.isActive = !user.isActive;
      await user.save();

      const userData = user.toJSON();
      delete (userData as any).password;

      return res.json({
        success: true,
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        data: userData,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Delete employee (for ADMIN)
  async deleteEmployee(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const storeId = req.user?.storeId;

      // Verify user belongs to the same store and is an employee
      const user = await User.findOne({
        where: {
          id,
          storeId,
          role: UserRole.EMPLOYEE,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
      }

      await user.destroy();

      return res.json({
        success: true,
        message: 'Employee deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const userController = new UserController();
