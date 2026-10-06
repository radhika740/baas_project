import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { ApiKeysRepository } from '../../api-keys/api-keys.repository';
import { RolesRepository } from '../../roles/roles.repository';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { ProjectAccessRequest } from '../interfaces/project-access.interface';

const PUBLIC_KEY_PERMISSIONS: string[] = ['records:read'];
const SECRET_KEY_PERMISSIONS: string[] = [
  'records:create',
  'records:read',
  'records:update',
  'records:delete',
];

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly roles: RolesRepository,
    private readonly apiKeys: ApiKeysRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const req = context.switchToHttp().getRequest<ProjectAccessRequest>();

    const rawProjectId = req.params['projectId'];
    const projectId = Array.isArray(rawProjectId)
      ? rawProjectId[0]
      : rawProjectId;
    if (!projectId) throw new ForbiddenException('Project context is required');

    const rawKey = req.headers['x-api-key'];
    const apiKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (apiKey) return this.checkApiKey(req, apiKey, projectId, required);
    return this.checkUser(req, projectId, required);
  }

  private async checkApiKey(
    req: ProjectAccessRequest,
    rawKey: string,
    projectId: string,
    required: string[],
  ): Promise<boolean> {
    const key = await this.apiKeys.findByHash(sha256(rawKey));
    const expired = key?.expires_at
      ? new Date(key.expires_at).getTime() <= Date.now()
      : false;

    if (!key || key.project_id !== projectId || key.revoked_at || expired) {
      throw new UnauthorizedException('Invalid API key');
    }

    const allowed =
      key.key_type === 'secret'
        ? SECRET_KEY_PERMISSIONS
        : PUBLIC_KEY_PERMISSIONS;
    if (!required.every((p) => allowed.includes(p))) {
      throw new ForbiddenException('This API key does not allow this action');
    }

    await this.apiKeys.touchLastUsed(key.id);
    req.apiKey = { id: key.id, projectId: key.project_id, type: key.key_type };
    return true;
  }

  private async checkUser(
    req: ProjectAccessRequest,
    projectId: string,
    required: string[],
  ): Promise<boolean> {
    const header = req.headers['authorization'];
    const [type, token] = header?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing access token or API key');
    }

    let userId: string;
    let phone: string;
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        phone: string;
      }>(token, { secret: this.config.get<string>('JWT_ACCESS_SECRET') });
      userId = payload.sub;
      phone = payload.phone;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    req.user = { id: userId, phone };

    const granted = await this.roles.getUserPermissions(projectId, userId);
    if (granted === null) throw new NotFoundException('Project not found');

    if (!required.every((p) => granted.includes(p))) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
    return true;
  }
}
