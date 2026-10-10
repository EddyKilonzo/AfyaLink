import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRole } from '../../database/entities/user.entity.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const SKIP_CSRF_KEY = 'skipCsrf';

/** Route is reachable without a session. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Route requires one of the given roles. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Opt a state-changing route out of CSRF checks. Use sparingly. */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

export interface SessionUser {
  id: string;
  role: UserRole;
  email: string;
}

export type AuthenticatedRequest = Request & { user?: SessionUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as SessionUser;
  },
);
