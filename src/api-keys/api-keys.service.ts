import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ApiKeyRow, ApiKeysRepository } from './api-keys.repository';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const toPublicKey = (k: ApiKeyRow) => ({
  id: k.id,
  name: k.name,
  keyType: k.key_type,
  keyPrefix: k.key_prefix,
  lastUsedAt: k.last_used_at,
  expiresAt: k.expires_at,
  revokedAt: k.revoked_at,
  createdAt: k.created_at,
});

@Injectable()
export class ApiKeysService {
  constructor(private readonly repo: ApiKeysRepository) {}

  async create(projectId: string, dto: CreateApiKeyDto) {
    const keyType = dto.keyType ?? 'public';

    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('expiresAt must be in the future');
      }
    }

    // The real key is shown once. Only its hash is stored.
    const fullKey = `${keyType === 'secret' ? 'sk_' : 'pk_'}${randomBytes(24).toString('hex')}`;
    const id = randomUUID();

    await this.repo.create({
      id,
      projectId,
      name: dto.name,
      keyHash: sha256(fullKey),
      keyPrefix: fullKey.slice(0, 11),
      keyType,
      expiresAt,
    });

    const row = await this.repo.findById(projectId, id);
    if (!row) throw new NotFoundException('API key not found');
    return { ...toPublicKey(row), key: fullKey };
  }

  async list(projectId: string, query: PaginationQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.repo.list(projectId, query.limit, offset),
      this.repo.count(projectId),
    ]);
    return { items: rows.map(toPublicKey), total };
  }

  async revoke(projectId: string, keyId: string) {
    const key = await this.repo.findById(projectId, keyId);
    if (!key) throw new NotFoundException('API key not found');
    if (key.revoked_at)
      throw new ConflictException('API key is already revoked');

    await this.repo.revoke(projectId, keyId);
    const updated = await this.repo.findById(projectId, keyId);
    return toPublicKey(updated as ApiKeyRow);
  }

  async remove(projectId: string, keyId: string) {
    const key = await this.repo.findById(projectId, keyId);
    if (!key) throw new NotFoundException('API key not found');
    await this.repo.remove(projectId, keyId);
  }
}
