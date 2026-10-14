import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';

export interface AuditEntry {
  projectId?: string | null;
  userId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

const SECRET_WORDS = ['password', 'token', 'secret', 'key', 'authorization'];

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  private clean(data?: Record<string, unknown>) {
    if (!data) return null;
    const safe: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(data)) {
      const isSecret = SECRET_WORDS.some((w) => name.toLowerCase().includes(w));
      safe[name] = isSecret ? '[hidden]' : value;
    }
    return JSON.stringify(safe);
  }

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO audit_logs
         (id, project_id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          entry.projectId ?? null,
          entry.userId ?? null,
          entry.action,
          entry.resourceType ?? null,
          entry.resourceId ?? null,
          entry.ipAddress ?? null,
          entry.userAgent ? entry.userAgent.slice(0, 255) : null,
          this.clean(entry.metadata),
        ],
      );
    } catch (error) {
      this.logger.error(`Audit log failed for action ${entry.action}`);
    }
  }
}
