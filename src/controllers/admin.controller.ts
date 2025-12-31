import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * Get dashboard statistics for Super Admin
 * @route GET /api/admin/stats
 * @access Super Admin only
 */
export const getAdminStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get store statistics
    const [totalStores, activeStores, pendingApproval, inactiveStores] = await Promise.all([
      prisma.store.count(),
      prisma.store.count({ where: { isActive: true, isApproved: true } }),
      prisma.store.count({ where: { isApproved: false } }),
      prisma.store.count({ where: { isActive: false } }),
    ]);

    // Get subscription statistics - handle if table doesn't exist yet
    let totalSubscriptions = 0;
    let activeSubscriptions = 0;
    let expiringSoon = 0;
    let totalRevenue = 0;

    try {
      [totalSubscriptions, activeSubscriptions, expiringSoon] = await Promise.all([
        prisma.subscription.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            renewalDate: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              gte: new Date(),
            },
          },
        }),
      ]);

      // Calculate total revenue from active subscriptions
      const revenueData = await prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true },
      });

      totalRevenue = Number(revenueData._sum.amount) || 0;
    } catch (subscriptionError) {
      // Subscription table doesn't exist yet, return 0 values
      console.log('Subscription table not found, returning default values');
    }

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
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let formattedSubscriptions: any[] = [];

    try {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          renewalDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          renewalDate: 'asc',
        },
      });

      formattedSubscriptions = subscriptions.map((sub) => {
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
    } catch (subscriptionError) {
      // Subscription table doesn't exist yet, return empty array
      console.log('Subscription table not found, returning empty subscriptions');
    }

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
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.subscription.count({ where }),
    ]);

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

    // Validate store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Calculate dates
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
          // Fallback if none matches
          finalEndDate.setMonth(finalEndDate.getMonth() + 1);
          finalRenewalDate.setMonth(finalRenewalDate.getMonth() + 1);
      }
    }

    const subscription = await prisma.subscription.create({
      data: {
        storeId,
        plan,
        billingCycle,
        amount,
        startDate: start,
        endDate: finalEndDate,
        renewalDate: finalRenewalDate,
        status: 'ACTIVE',
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: subscription,
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

    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });

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

    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
