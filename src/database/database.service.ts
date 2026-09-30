import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { MYSQL_POOL } from './database.constants';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async query<T = any>(sql: string, params: any = []): Promise<T[]> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  async execute(sql: string, params: any = []): Promise<ResultSetHeader> {
    const [result] = await this.pool.execute(sql, params);
    return result as ResultSetHeader;
  }

  async transaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await work(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async ping(): Promise<boolean> {
    await this.pool.query('SELECT 1');
    return true;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
