import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';
  storeId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BillCreateInput {
  customerName: string;
  customerPhone: string;
  customerId?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: {
    categoryId: string;
    quantity: number;
  }[];
  notes?: string;
  status?: 'PENDING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus?: 'PENDING' | 'PAID';
  paymentMethod?: 'CASH' | 'ONLINE' | 'UPI' | 'OTHER';
}

export interface BillUpdateInput {
  status?: 'PENDING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus?: 'PENDING' | 'PAID';
  paymentMethod?: 'CASH' | 'ONLINE' | 'UPI' | 'OTHER';
  notes?: string;
}

export interface CustomerCreateInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface CustomerUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CategoryCreateInput {
  name: string;
  price: number;
  icon?: string;
  serviceTypeId?: string;
}

export interface CategoryUpdateInput {
  name?: string;
  price?: number;
  icon?: string;
  isActive?: boolean;
  serviceTypeId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'EMPLOYEE';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    storeId?: string;
    createdAt?: Date;
  };
  store?: {
    id: string;
    name: string;
    isActive: boolean;
    deactivationReason?: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface NotificationPayload {
  billId: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  recipient: string;
  message: string;
}

export interface DashboardStats {
  totalBills: number;
  pendingBills: number;
  completedBills: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  recentBills: any[];
}

