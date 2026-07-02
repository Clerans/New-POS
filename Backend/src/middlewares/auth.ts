import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface UserPayload {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

// Extend Request interface to support user payload
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No authentication token provided');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
};

export const authorize = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserPayload | undefined;
    if (!user) {
      throw new UnauthorizedError('User is not authenticated');
    }

    const { roles, permissions } = user;

    // Admins bypass normal permissions checks
    if (roles.includes('Admin') || roles.includes('admin')) {
      return next();
    }

    const hasAll = requiredPermissions.every((p) => permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenError('You do not have the required permissions to perform this action');
    }

    next();
  };
};
