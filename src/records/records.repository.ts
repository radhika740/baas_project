import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface RecordRow {
  id: string;
  resource_id: string;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export type SortSpec =
  | { kind: 'column'; column: 'created_at' | 'updated_at' }
  | { kind: 'field'; field: string };

const COLUMNS = 'id, resource_id, data, created_by, created_at, updated_at';

@Injectable()
export class RecordsRepository {
  constructor(private readonly db: DatabaseService) {}

  async insert(r: {
    id: string;
    resourceId: string;
    data: string;
    createdBy: string | null;
  }) {
    await this.db.execute(
      'INSERT INTO records (id, resource_id, data, created_by) VALUES (?, ?, ?, ?)',
      [r.id, r.resourceId, r.data, r.createdBy],
    );
  }

  private buildWhere(resourceId: string, filters: [string, string][]) {
    const where = ['resource_id = ?'];
    const params: string[] = [resourceId];
    for (const [field, value] of filters) {
      where.push('JSON_UNQUOTE(JSON_EXTRACT(data, ?)) = ?');
      params.push(`$.${field}`, value);
    }
    return { where: where.join(' AND '), params };
  }

  async list(
    resourceId: string,
    filters: [string, string][],
    sort: SortSpec,
    order: 'ASC' | 'DESC',
    limit: number,
    offset: number,
  ): Promise<RecordRow[]> {
    const { where, params } = this.buildWhere(resourceId, filters);

    let orderBy: string;
    const orderParams: string[] = [];
    if (sort.kind === 'column') {
      orderBy = `${sort.column} ${order}`;
    } else {
      orderBy = `JSON_EXTRACT(data, ?) ${order}, created_at DESC`;
      orderParams.push(`$.${sort.field}`);
    }

    return this.db.query<RecordRow>(
      `SELECT ${COLUMNS} FROM records
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, ...orderParams, limit, offset],
    );
  }

  async count(
    resourceId: string,
    filters: [string, string][],
  ): Promise<number> {
    const { where, params } = this.buildWhere(resourceId, filters);
    const rows = await this.db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM records WHERE ${where}`,
      params,
    );
    return Number(rows[0]?.total ?? 0);
  }

  async findById(
    resourceId: string,
    recordId: string,
  ): Promise<RecordRow | null> {
    const rows = await this.db.query<RecordRow>(
      `SELECT ${COLUMNS} FROM records WHERE resource_id = ? AND id = ? LIMIT 1`,
      [resourceId, recordId],
    );
    return rows[0] ?? null;
  }

  async mergeData(resourceId: string, recordId: string, patchJson: string) {
    await this.db.execute(
      'UPDATE records SET data = JSON_MERGE_PATCH(data, CAST(? AS JSON)) WHERE resource_id = ? AND id = ?',
      [patchJson, resourceId, recordId],
    );
  }

  async remove(resourceId: string, recordId: string) {
    await this.db.execute(
      'DELETE FROM records WHERE resource_id = ? AND id = ?',
      [resourceId, recordId],
    );
  }
}
