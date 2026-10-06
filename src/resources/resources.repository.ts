import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface ResourceRow {
  id: string;
  project_id: string;
  name: string;
  status: 'active' | 'disabled';
  created_at: Date;
}

const COLUMNS = 'id, project_id, name, status, created_at';

@Injectable()
export class ResourcesRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(r: { id: string; projectId: string; name: string }) {
    await this.db.execute(
      'INSERT INTO resources (id, project_id, name, table_name) VALUES (?, ?, ?, ?)',
      [r.id, r.projectId, r.name, 'records'],
    );
  }

  async findByName(
    projectId: string,
    name: string,
  ): Promise<ResourceRow | null> {
    const rows = await this.db.query<ResourceRow>(
      `SELECT ${COLUMNS} FROM resources WHERE project_id = ? AND name = ? LIMIT 1`,
      [projectId, name],
    );
    return rows[0] ?? null;
  }

  async findById(projectId: string, id: string): Promise<ResourceRow | null> {
    const rows = await this.db.query<ResourceRow>(
      `SELECT ${COLUMNS} FROM resources WHERE project_id = ? AND id = ? LIMIT 1`,
      [projectId, id],
    );
    return rows[0] ?? null;
  }

  async list(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<ResourceRow[]> {
    return this.db.query<ResourceRow>(
      `SELECT ${COLUMNS} FROM resources
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [projectId, limit, offset],
    );
  }

  async count(projectId: string): Promise<number> {
    const rows = await this.db.query<{ total: number }>(
      'SELECT COUNT(*) AS total FROM resources WHERE project_id = ?',
      [projectId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async update(
    projectId: string,
    id: string,
    fields: { name?: string; status?: 'active' | 'disabled' },
  ) {
    const sets: string[] = [];
    const params: string[] = [];
    if (fields.name !== undefined) {
      sets.push('name = ?');
      params.push(fields.name);
    }
    if (fields.status !== undefined) {
      sets.push('status = ?');
      params.push(fields.status);
    }
    if (sets.length === 0) return;
    await this.db.execute(
      `UPDATE resources SET ${sets.join(', ')} WHERE project_id = ? AND id = ?`,
      [...params, projectId, id],
    );
  }

  async remove(projectId: string, id: string) {
    await this.db.execute(
      'DELETE FROM resources WHERE project_id = ? AND id = ?',
      [projectId, id],
    );
  }
}
