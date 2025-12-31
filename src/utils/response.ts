import { Response } from 'express';
import { ApiResponse } from '../types';

export class ApiResponseUtil {
  static success<T>(res: Response, data?: T, message?: string, statusCode = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode = 400, errors?: any[]): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data?: T, message = 'Resource created successfully'): Response {
    return this.success(res, data, message, 201);
  }

  static notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, 404);
  }

  static unauthorized(res: Response, message = 'Unauthorized access'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  static serverError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }

  static validationError(res: Response, errors: any[], message = 'Validation failed'): Response {
    return this.error(res, message, 422, errors);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    return res.status(200).json(response);
  }
}
