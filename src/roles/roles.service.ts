import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly repo: RolesRepository) {}

  async listForProject(projectId: string) {
    const rows = await this.repo.listRolesWithPermissions(projectId);
    const byId = new Map<
      string,
      {
        id: string;
        name: string;
        description: string | null;
        permissions: string[];
      }
    >();

    for (const r of rows) {
      let role = byId.get(r.id);
      if (!role) {
        role = {
          id: r.id,
          name: r.name,
          description: r.description,
          permissions: [],
        };
        byId.set(r.id, role);
      }
      if (r.permission) role.permissions.push(r.permission);
    }
    return [...byId.values()];
  }

  listPermissions() {
    return this.repo.listPermissions();
  }
}
