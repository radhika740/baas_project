import type { Request } from 'express';

export interface AuthUser {
  id: string;
  phone: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
