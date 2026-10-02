import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesRepository } from '../../roles/roles.repository';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthenticatedRequest } from '../interfaces/auth-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roles: RolesRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) throw new UnauthorizedException('Not authenticated');

    const rawProjectId = req.params['projectId'];
    const projectId = Array.isArray(rawProjectId)
      ? rawProjectId[0]
      : rawProjectId;
    if (!projectId) throw new ForbiddenException('Project context is required');

    const granted = await this.roles.getUserPermissions(projectId, req.user.id);
    if (granted === null) throw new NotFoundException('Project not found');

    if (!required.every((p) => granted.includes(p))) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
    return true;
  }
}
