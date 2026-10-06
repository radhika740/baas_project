import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface ApiKeyRow {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  key_type: 'public' | 'secret';
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

const COLUMNS =
  'id, project_id, name, key_prefix, key_type, last_used_at, expires_at, revoked_at, created_at';

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(k: {
    id: string;
    projectId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    keyType: 'public' | 'secret';
    expiresAt: Date | null;
  }) {
    await this.db.execute(
      `INSERT INTO api_keys (id, project_id, name, key_hash, key_prefix, key_type, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        k.id,
        k.projectId,
        k.name,
        k.keyHash,
        k.keyPrefix,
        k.keyType,
        k.expiresAt,
      ],
    );
  }

  async list(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<ApiKeyRow[]> {
    return this.db.query<ApiKeyRow>(
      `SELECT ${COLUMNS} FROM api_keys
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [projectId, limit, offset],
    );
  }

  async count(projectId: string): Promise<number> {
    const rows = await this.db.query<{ total: number }>(
      'SELECT COUNT(*) AS total FROM api_keys WHERE project_id = ?',
      [projectId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async findById(projectId: string, keyId: string): Promise<ApiKeyRow | null> {
    const rows = await this.db.query<ApiKeyRow>(
      `SELECT ${COLUMNS} FROM api_keys WHERE project_id = ? AND id = ? LIMIT 1`,
      [projectId, keyId],
    );
    return rows[0] ?? null;
  }

  /** Finds a key by the hash of its value. Only keys of active projects are returned. */
  async findByHash(keyHash: string): Promise<ApiKeyRow | null> {
    const rows = await this.db.query<ApiKeyRow>(
      `SELECT k.id, k.project_id, k.name, k.key_prefix, k.key_type,
              k.last_used_at, k.expires_at, k.revoked_at, k.created_at
       FROM api_keys k
       JOIN projects p ON p.id = k.project_id AND p.status = 'active'
       WHERE k.key_hash = ?
       LIMIT 1`,
      [keyHash],
    );
    return rows[0] ?? null;
  }

  async touchLastUsed(id: string) {
    await this.db.execute(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = ?',
      [id],
    );
  }

  async revoke(projectId: string, keyId: string) {
    await this.db.execute(
      'UPDATE api_keys SET revoked_at = NOW() WHERE project_id = ? AND id = ? AND revoked_at IS NULL',
      [projectId, keyId],
    );
  }

  async remove(projectId: string, keyId: string) {
    await this.db.execute(
      'DELETE FROM api_keys WHERE project_id = ? AND id = ?',
      [projectId, keyId],
    );
  }
}
