import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceRow, ResourcesRepository } from './resources.repository';

const toPublicResource = (r: ResourceRow) => ({
  id: r.id,
  name: r.name,
  status: r.status,
  createdAt: r.created_at,
});

@Injectable()
export class ResourcesService {
  constructor(private readonly repo: ResourcesRepository) {}

  async create(projectId: string, dto: CreateResourceDto) {
    if (await this.repo.findByName(projectId, dto.name)) {
      throw new ConflictException('A resource with this name already exists');
    }
    const id = randomUUID();
    await this.repo.create({ id, projectId, name: dto.name });
    return this.get(projectId, id);
  }

  async list(projectId: string, query: PaginationQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.repo.list(projectId, query.limit, offset),
      this.repo.count(projectId),
    ]);
    return { items: rows.map(toPublicResource), total };
  }

  async get(projectId: string, id: string) {
    const resource = await this.repo.findById(projectId, id);
    if (!resource) throw new NotFoundException('Resource not found');
    return toPublicResource(resource);
  }

  async update(projectId: string, id: string, dto: UpdateResourceDto) {
    const resource = await this.repo.findById(projectId, id);
    if (!resource) throw new NotFoundException('Resource not found');

    if (dto.name !== undefined && dto.name !== resource.name) {
      if (await this.repo.findByName(projectId, dto.name)) {
        throw new ConflictException('A resource with this name already exists');
      }
    }

    await this.repo.update(projectId, id, dto);
    return this.get(projectId, id);
  }

  async remove(projectId: string, id: string) {
    const resource = await this.repo.findById(projectId, id);
    if (!resource) throw new NotFoundException('Resource not found');
    await this.repo.remove(projectId, id);
  }
}
