import type { Request } from 'express';
import type { AuthUser } from './auth-user.interface';

export interface ApiKeyPrincipal {
  id: string;
  projectId: string;
  type: 'public' | 'secret';
}

export interface ProjectAccessRequest extends Request {
  user?: AuthUser;
  apiKey?: ApiKeyPrincipal;
}
