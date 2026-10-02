import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface MembershipRow {
  member_id: string;
  user_id: string;
  role_name: string;
}

export interface MemberDetailRow {
  id: string;
  user_id: string;
  phone: string;
  first_name: string;
  last_name: string;
  role_name: string;
  created_at: Date;
}

@Injectable()
export class ProjectMembersRepository {
  constructor(private readonly db: DatabaseService) {}

  /** The caller's own membership in a project (null if not a member or project deleted). */
  async getMembership(
    projectId: string,
    userId: string,
  ): Promise<MembershipRow | null> {
    const rows = await this.db.query<MembershipRow>(
      `SELECT m.id AS member_id, m.user_id, r.name AS role_name
       FROM project_members m
       JOIN roles r ON r.id = m.role_id
       JOIN projects p ON p.id = m.project_id
       WHERE m.project_id = ? AND m.user_id = ? AND p.status <> 'deleted'
       LIMIT 1`,
      [projectId, userId],
    );
    return rows[0] ?? null;
  }

  async findRoleId(
    projectId: string,
    roleName: string,
  ): Promise<string | null> {
    const rows = await this.db.query<{ id: string }>(
      'SELECT id FROM roles WHERE project_id = ? AND name = ? LIMIT 1',
      [projectId, roleName],
    );
    return rows[0]?.id ?? null;
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
      [projectId, userId],
    );
    return rows.length > 0;
  }

  async insert(m: {
    id: string;
    projectId: string;
    userId: string;
    roleId: string;
  }) {
    await this.db.execute(
      'INSERT INTO project_members (id, project_id, user_id, role_id) VALUES (?, ?, ?, ?)',
      [m.id, m.projectId, m.userId, m.roleId],
    );
  }

  async list(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<MemberDetailRow[]> {
    return this.db.query<MemberDetailRow>(
      `SELECT m.id, m.user_id, u.phone, u.first_name, u.last_name,
              r.name AS role_name, m.created_at
       FROM project_members m
       JOIN users u ON u.id = m.user_id
       JOIN roles r ON r.id = m.role_id
       WHERE m.project_id = ?
       ORDER BY m.created_at ASC
       LIMIT ? OFFSET ?`,
      [projectId, limit, offset],
    );
  }

  async count(projectId: string): Promise<number> {
    const rows = await this.db.query<{ total: number }>(
      'SELECT COUNT(*) AS total FROM project_members WHERE project_id = ?',
      [projectId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async findDetail(
    projectId: string,
    memberId: string,
  ): Promise<MemberDetailRow | null> {
    const rows = await this.db.query<MemberDetailRow>(
      `SELECT m.id, m.user_id, u.phone, u.first_name, u.last_name,
              r.name AS role_name, m.created_at
       FROM project_members m
       JOIN users u ON u.id = m.user_id
       JOIN roles r ON r.id = m.role_id
       WHERE m.project_id = ? AND m.id = ?
       LIMIT 1`,
      [projectId, memberId],
    );
    return rows[0] ?? null;
  }

  async updateRole(projectId: string, memberId: string, roleId: string) {
    await this.db.execute(
      'UPDATE project_members SET role_id = ? WHERE id = ? AND project_id = ?',
      [roleId, memberId, projectId],
    );
  }

  async remove(projectId: string, memberId: string) {
    await this.db.execute(
      'DELETE FROM project_members WHERE id = ? AND project_id = ?',
      [memberId, projectId],
    );
  }
}
