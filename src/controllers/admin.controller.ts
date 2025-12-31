import { Request, Response, NextFunction } from 'express';
import { Store } from '../models/Store';
import { Subscription } from '../models/Subscription';
import { AppError } from '../middleware/errorHandler';
import { Op } from 'sequelize';

/**
 * Get dashboard statistics for Super Admin
 * @route GET /api/admin/stats
 * @access Super Admin only
 */
export const getAdminStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get store statistics
    const [totalStores, activeStores, pendingApproval, inactiveStores] = await Promise.all([
      Store.count(),
      Store.count({ where: { isActive: true, isApproved: true } }),
      Store.count({ where: { isApproved: false } }),
      Store.count({ where: { isActive: false } }),
    ]);

    // Get subscription statistics
    let totalSubscriptions = await Subscription.count();
    let activeSubscriptions = await Subscription.count({ where: { status: 'ACTIVE' } });
    let expiringSoon = await Subscription.count({
      where: {
        status: 'ACTIVE',
        renewalDate: {
          [Op.between]: [new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
        },
      },
    });

    const revenueData = await Subscription.sum('amount', {
      where: { status: 'ACTIVE' }
    });

    const totalRevenue = Number(revenueData) || 0;

    res.json({
      success: true,
      data: {
        totalStores,
        activeStores,
        pendingApproval,
        inactiveStores,
        totalSubscriptions,
        activeSubscriptions,
        expiringSoon,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscriptions expiring soon
 * @route GET /api/admin/subscriptions/expiring-soon
 * @access Super Admin only
 */
export const getExpiringSubscriptions = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subscriptions = await Subscription.findAll({
      where: {
        status: 'ACTIVE',
        renewalDate: {
          [Op.between]: [new Date(), thirtyDaysFromNow],
        },
      },
      include: [
        {
          model: Store,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['renewalDate', 'ASC']],
    });

    const formattedSubscriptions = subscriptions.map((sub) => {
      const daysUntilRenewal = Math.ceil(
        (new Date(sub.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: sub.id,
        storeName: sub.store.name,
        storeEmail: sub.store.email,
        plan: sub.plan,
        status: sub.status,
        renewalDate: sub.renewalDate,
        amount: Number(sub.amount),
        daysUntilRenewal,
      };
    });

    res.json({
      success: true,
      data: formattedSubscriptions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all subscriptions with filtering and pagination
 * @route GET /api/admin/subscriptions
 * @access Super Admin only
 */
export const getAllSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status, plan } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const { rows: subscriptions, count: total } = await Subscription.findAndCountAll({
      where,
      include: [
        {
          model: Store,
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    const formattedSubscriptions = subscriptions.map((sub) => ({
      id: sub.id,
      store: sub.store,
      plan: sub.plan,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      renewalDate: sub.renewalDate,
      amount: Number(sub.amount),
      billingCycle: sub.billingCycle,
      autoRenew: sub.autoRenew,
      createdAt: sub.createdAt,
    }));

    res.json({
      success: true,
      data: formattedSubscriptions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new subscription for a store
 * @route POST /api/admin/subscriptions
 * @access Super Admin only
 */
export const createSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { storeId, plan, billingCycle, amount, startDate, endDate } = req.body;

    const store = await Store.findByPk(storeId);

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    const start = startDate ? new Date(startDate) : new Date();
    let finalEndDate: Date;
    let finalRenewalDate: Date;

    if (plan === 'FREE' && billingCycle === 'CUSTOM' && endDate) {
      finalEndDate = new Date(endDate);
      finalRenewalDate = new Date(endDate);
    } else {
      finalEndDate = new Date(start);
      finalRenewalDate = new Date(start);

      switch (billingCycle) {
        case 'MONTHLY':
          finalEndDate.setMonth(finalEndDate.getMonth() + 1);
          finalRenewalDate.setMonth(finalRenewalDate.getMonth() + 1);
          break;
        case 'QUARTERLY':
          finalEndDate.setMonth(finalEndDate.getMonth() + 3);
          finalRenewalDate.setMonth(finalRenewalDate.getMonth() + 3);
          break;
        case 'YEARLY':
          finalEndDate.setFullYear(finalEndDate.getFullYear() + 1);
          finalRenewalDate.setFullYear(finalRenewalDate.getFullYear() + 1);
          break;
        default:
          finalEndDate.setMonth(finalEndDate.getMonth() + 1);
          finalRenewalDate.setMonth(finalRenewalDate.getMonth() + 1);
      }
    }

    const subscription = await Subscription.create({
      storeId,
      plan,
      billingCycle,
      amount,
      startDate: start,
      endDate: finalEndDate,
      renewalDate: finalRenewalDate,
      status: 'ACTIVE',
    } as any);

    const fullSubscription = await Subscription.findByPk(subscription.id, {
      include: [{ model: Store, attributes: ['id', 'name', 'email'] }]
    });

    res.status(201).json({
      success: true,
      data: fullSubscription,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update subscription status
 * @route PATCH /api/admin/subscriptions/:id
 * @access Super Admin only
 */
export const updateSubscriptionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, cancelReason } = req.body;

    const subscription = await Subscription.findByPk(id);

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    const updateData: any = { status };

    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      if (cancelReason) {
        updateData.cancelReason = cancelReason;
      }
    }

    await subscription.update(updateData);

    const updatedSubscription = await Subscription.findByPk(id, {
      include: [{ model: Store, attributes: ['id', 'name', 'email'] }]
    });

    res.json({
      success: true,
      data: updatedSubscription,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
