import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DEFAULT_ROLE_PERMISSIONS } from '../common/constants/permissions';
import { DatabaseService } from '../database/database.service';

export interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  status: 'active' | 'suspended' | 'deleted';
  created_at: Date;
  updated_at: Date;
}

const DEFAULT_ROLES = [
  { name: 'Owner', description: 'Full control of the project' },
  { name: 'Admin', description: 'Manage project settings and members' },
  { name: 'Developer', description: 'Manage resources and records' },
  { name: 'Viewer', description: 'Read-only access' },
];

@Injectable()
export class ProjectsRepository {
  constructor(private readonly db: DatabaseService) {}

  /** Creates the project, its 4 default roles (with permissions), and the owner's membership together. */
  async createWithDefaults(p: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
  }) {
    await this.db.transaction(async (conn) => {
      await conn.execute(
        'INSERT INTO projects (id, name, slug, owner_id) VALUES (?, ?, ?, ?)',
        [p.id, p.name, p.slug, p.ownerId],
      );

      let ownerRoleId = '';
      for (const role of DEFAULT_ROLES) {
        const roleId = randomUUID();
        if (role.name === 'Owner') ownerRoleId = roleId;
        await conn.execute(
          'INSERT INTO roles (id, name, project_id, description) VALUES (?, ?, ?, ?)',
          [roleId, role.name, p.id, role.description],
        );

        const permissions = DEFAULT_ROLE_PERMISSIONS[role.name] ?? [];
        if (permissions.length > 0) {
          await conn.query(
            'INSERT IGNORE INTO role_permissions (role_id, permission_id) SELECT ?, id FROM permissions WHERE name IN (?)',
            [roleId, [...permissions]],
          );
        }
      }

      await conn.execute(
        'INSERT INTO project_members (id, project_id, user_id, role_id) VALUES (?, ?, ?, ?)',
        [randomUUID(), p.id, p.ownerId, ownerRoleId],
      );
    });
  }

  async findForMember(
    projectId: string,
    userId: string,
  ): Promise<ProjectRow | null> {
    const rows = await this.db.query<ProjectRow>(
      `SELECT p.* FROM projects p
       JOIN project_members m ON m.project_id = p.id
       WHERE p.id = ? AND m.user_id = ? AND p.status <> 'deleted'
       LIMIT 1`,
      [projectId, userId],
    );
    return rows[0] ?? null;
  }

  async listForMember(userId: string, limit: number, offset: number) {
    return this.db.query<ProjectRow>(
      `SELECT p.* FROM projects p
       JOIN project_members m ON m.project_id = p.id
       WHERE m.user_id = ? AND p.status <> 'deleted'
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );
  }

  async countForMember(userId: string): Promise<number> {
    const rows = await this.db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM projects p
       JOIN project_members m ON m.project_id = p.id
       WHERE m.user_id = ? AND p.status <> 'deleted'`,
      [userId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async updateName(id: string, name: string) {
    await this.db.execute('UPDATE projects SET name = ? WHERE id = ?', [
      name,
      id,
    ]);
  }

  async softDelete(id: string) {
    await this.db.execute(
      "UPDATE projects SET status = 'deleted' WHERE id = ?",
      [id],
    );
  }
}
