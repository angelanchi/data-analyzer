import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from 'shared/types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  // 開發環境下包含詳細錯誤信息
  if (process.env.NODE_ENV === 'development') {
    response.data = {
      stack: err.stack,
      url: req.url,
      method: req.method
    };
  }

  res.status(statusCode).json(response);
};

export const createAppError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};