import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

@Injectable()
export class RefreshTokensRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(t: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    await this.db.execute(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [t.id, t.userId, t.tokenHash, t.expiresAt],
    );
  }

  async findById(id: string): Promise<RefreshTokenRow | null> {
    const rows = await this.db.query<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] ?? null;
  }

  async revoke(id: string) {
    await this.db.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL',
      [id],
    );
  }

  async revokeAllForUser(userId: string) {
    await this.db.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId],
    );
  }
}
