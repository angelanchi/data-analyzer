import { Request, Response } from 'express';
import { ApiResponse } from 'shared/types';

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  };

  res.status(404).json(response);
};