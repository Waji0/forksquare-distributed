import { Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';
import type { AuthenticatedRequest, JwtPayload } from './auth';

/**
 * Role-Based Access Control (RBAC)
 *
 * Defines user roles and provides middleware to restrict
 * routes based on the authenticated user's role.
 *
 * Roles:
 * - admin:      Full access to all resources
 * - restaurant: Can manage their own restaurant, menus, and orders
 * - user:       Standard customer access
 */

export enum Role {
  ADMIN = 'admin',
  RESTAURANT = 'restaurant',
  USER = 'user',
}

// Permission hierarchy: admin > restaurant > user
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ADMIN]: 100,
  [Role.RESTAURANT]: 50,
  [Role.USER]: 10,
};

/**
 * Middleware factory: require the user to have one of the specified roles.
 *
 * Usage:
 *   router.get('/admin/dashboard', authenticateToken, requireRole(Role.ADMIN), handler)
 *   router.get('/orders', authenticateToken, requireRole(Role.USER, Role.ADMIN), handler)
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const user = req.user as JwtPayload | undefined;

    if (!user) {
      throw new ApiError(401, 'Authentication required.');
    }

    const userRole = (user.role as Role) ?? Role.USER;

    if (!allowedRoles.includes(userRole)) {
      throw new ApiError(
        403,
        `Access denied. Required role: [${allowedRoles.join(', ')}]. Your role: ${userRole}`
      );
    }

    next();
  };
}

/**
 * Middleware factory: require the user to have at least a minimum role level.
 * Useful for hierarchical access (e.g., "admin or above").
 */
export function requireMinRole(minimumRole: Role) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const user = req.user as JwtPayload | undefined;

    if (!user) {
      throw new ApiError(401, 'Authentication required.');
    }

    const userRole = (user.role as Role) ?? Role.USER;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

    if (userLevel < requiredLevel) {
      throw new ApiError(
        403,
        `Insufficient permissions. Required: ${minimumRole}. Your role: ${userRole}`
      );
    }

    next();
  };
}

/**
 * Convenience middleware: only admins
 */
export const requireAdmin = requireRole(Role.ADMIN);

/**
 * Convenience middleware: admins and restaurant owners
 */
export const requireAdminOrRestaurant = requireRole(Role.ADMIN, Role.RESTAURANT);