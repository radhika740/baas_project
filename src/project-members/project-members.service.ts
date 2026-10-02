import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UsersService } from '../users/users.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import {
  MemberDetailRow,
  MembershipRow,
  ProjectMembersRepository,
} from './project-members.repository';

const toPublicMember = (m: MemberDetailRow) => ({
  id: m.id,
  userId: m.user_id,
  phone: m.phone,
  firstName: m.first_name,
  lastName: m.last_name,
  role: m.role_name,
  joinedAt: m.created_at,
});

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly repo: ProjectMembersRepository,
    private readonly users: UsersService,
  ) {}

  async add(actorId: string, projectId: string, dto: AddMemberDto) {
    await this.requireManager(actorId, projectId);

    const user = await this.users.findByPhone(dto.phone);
    if (!user)
      throw new NotFoundException('User not found. They must register first.');

    if (await this.repo.isMember(projectId, user.id)) {
      throw new ConflictException('User is already a member of this project');
    }

    const roleId = await this.repo.findRoleId(projectId, dto.role);
    if (!roleId) throw new NotFoundException('Role not found');

    const id = randomUUID();
    await this.repo.insert({ id, projectId, userId: user.id, roleId });
    return this.getDetail(projectId, id);
  }

  async list(actorId: string, projectId: string, query: PaginationQueryDto) {
    await this.requireMember(actorId, projectId);
    const offset = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.repo.list(projectId, query.limit, offset),
      this.repo.count(projectId),
    ]);
    return { items: rows.map(toPublicMember), total };
  }

  async updateRole(
    actorId: string,
    projectId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.requireManager(actorId, projectId);

    const target = await this.repo.findDetail(projectId, memberId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role_name === 'Owner') {
      throw new ForbiddenException('The owner role cannot be changed');
    }

    const roleId = await this.repo.findRoleId(projectId, dto.role);
    if (!roleId) throw new NotFoundException('Role not found');

    await this.repo.updateRole(projectId, memberId, roleId);
    return this.getDetail(projectId, memberId);
  }

  async remove(actorId: string, projectId: string, memberId: string) {
    await this.requireManager(actorId, projectId);

    const target = await this.repo.findDetail(projectId, memberId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role_name === 'Owner') {
      throw new ForbiddenException('The project owner cannot be removed');
    }

    await this.repo.remove(projectId, memberId);
  }

  private async getDetail(projectId: string, memberId: string) {
    const row = await this.repo.findDetail(projectId, memberId);
    if (!row) throw new NotFoundException('Member not found');
    return toPublicMember(row);
  }

  /** Must belong to the project. Non-members get "not found" so project ids stay private. */
  private async requireMember(
    actorId: string,
    projectId: string,
  ): Promise<MembershipRow> {
    const m = await this.repo.getMembership(projectId, actorId);
    if (!m) throw new NotFoundException('Project not found');
    return m;
  }

  private async requireManager(actorId: string, projectId: string) {
    const m = await this.requireMember(actorId, projectId);
    if (m.role_name !== 'Owner' && m.role_name !== 'Admin') {
      throw new ForbiddenException(
        'Only the owner or an admin can manage members',
      );
    }
    return m;
  }
}
