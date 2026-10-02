import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface RolePermissionRow {
  id: string;
  name: string;
  description: string | null;
  permission: string | null;
}

export interface PermissionRow {
  name: string;
  resource: string;
  action: string;
}

@Injectable()
export class RolesRepository {
  constructor(private readonly db: DatabaseService) {}

  /** Permission names the user has in the project. Null if not a member (or project deleted). */
  async getUserPermissions(
    projectId: string,
    userId: string,
  ): Promise<string[] | null> {
    const rows = await this.db.query<{ permission: string | null }>(
      `SELECT p.name AS permission
       FROM project_members m
       JOIN projects pr ON pr.id = m.project_id AND pr.status <> 'deleted'
       LEFT JOIN role_permissions rp ON rp.role_id = m.role_id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE m.project_id = ? AND m.user_id = ?`,
      [projectId, userId],
    );
    if (rows.length === 0) return null;
    return rows.map((r) => r.permission).filter((n): n is string => n !== null);
  }

  async listRolesWithPermissions(
    projectId: string,
  ): Promise<RolePermissionRow[]> {
    return this.db.query<RolePermissionRow>(
      `SELECT r.id, r.name, r.description, p.name AS permission
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE r.project_id = ?
       ORDER BY FIELD(r.name, 'Owner', 'Admin', 'Developer', 'Viewer'), p.name`,
      [projectId],
    );
  }

  async listPermissions(): Promise<PermissionRow[]> {
    return this.db.query<PermissionRow>(
      'SELECT name, resource, action FROM permissions ORDER BY resource, action',
    );
  }
}
