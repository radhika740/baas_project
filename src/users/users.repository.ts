import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface UserRow {
  id: string;
  phone: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'suspended' | 'pending';
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(u: {
    id: string;
    phone: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }) {
    await this.db.execute(
      'INSERT INTO users (id, phone, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
      [u.id, u.phone, u.passwordHash, u.firstName, u.lastName],
    );
  }

  async findByPhone(phone: string): Promise<UserRow | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE phone = ? LIMIT 1',
      [phone],
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const rows = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] ?? null;
  }

  async updateProfile(
    id: string,
    fields: { firstName?: string; lastName?: string },
  ) {
    const sets: string[] = [];
    const params: string[] = [];
    if (fields.firstName !== undefined) {
      sets.push('first_name = ?');
      params.push(fields.firstName);
    }
    if (fields.lastName !== undefined) {
      sets.push('last_name = ?');
      params.push(fields.lastName);
    }
    if (sets.length === 0) return;
    await this.db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
  }

  async updatePassword(id: string, passwordHash: string) {
    await this.db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [
      passwordHash,
      id,
    ]);
  }

  async delete(id: string) {
    await this.db.execute('DELETE FROM users WHERE id = ?', [id]);
  }
}
