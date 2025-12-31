import { Request, Response, NextFunction } from 'express';
import { ApiResponseUtil } from '../utils/response';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error occurred:', err);

  if (err instanceof AppError) {
    ApiResponseUtil.error(res, err.message, err.statusCode);
    return;
  }

  if (err.name === 'ValidationError') {
    ApiResponseUtil.validationError(res, [err.message]);
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    ApiResponseUtil.unauthorized(res, 'Invalid token');
    return;
  }

  if (err.name === 'TokenExpiredError') {
    ApiResponseUtil.unauthorized(res, 'Token expired');
    return;
  }

  if (env.NODE_ENV === 'development') {
    ApiResponseUtil.error(res, err.message, 500);
  } else {
    ApiResponseUtil.serverError(res);
  }
};

export const handleSequelizeError = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'SequelizeUniqueConstraintError') {
    ApiResponseUtil.error(res, 'Duplicate entry', 400);
    return;
  }
  next(err);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponseUtil.notFound(res, `Route ${req.originalUrl} not found`);
};
