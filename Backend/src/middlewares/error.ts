import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import logger from '../config/logger.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else {
    logger.error(`[Unexpected Error]: ${err.message}`, { stack: err.stack });
  }

  logger.warn(`[HTTP Error Response] Status: ${statusCode} -- Message: ${message}`);

  res.status(statusCode).json(errorResponse(message, errors));
};

export default errorHandler;
