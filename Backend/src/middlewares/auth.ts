import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface UserPayload {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  branchId?: string;
}

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
    throw new UnauthorizedError('Invalid or expired access token');
  }
};

/**
 * Enforce that the user has at least one of the specified roles
 */
export const requireRole = (allowedRoles: string | string[]) => {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserPayload | undefined;
    if (!user) {
      throw new UnauthorizedError('User is not authenticated');
    }

    const hasRole = user.roles.some((role) => rolesArray.includes(role));
    if (!hasRole) {
      throw new ForbiddenError('You do not have the required role to access this resource');
    }

    next();
  };
};

/**
 * Enforce that the user has the required permission
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserPayload | undefined;
    if (!user) {
      throw new UnauthorizedError('User is not authenticated');
    }

    const { roles, permissions } = user;

    // Super Admin, Admin, and Owner bypass all permissions checks
    const hasBypassRole = roles.some((r) =>
      ['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(r.toUpperCase())
    );

    if (hasBypassRole || permissions.includes('*') || permissions.includes(requiredPermission)) {
      return next();
    }

    throw new ForbiddenError(`You do not have the required permission: '${requiredPermission}'`);
  };
};
export default authenticate;
