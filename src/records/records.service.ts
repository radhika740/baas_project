import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ResourcesRepository } from '../resources/resources.repository';
import { RecordRow, RecordsRepository, SortSpec } from './records.repository';

const RESERVED_QUERY_KEYS = new Set(['page', 'limit', 'sort', 'order']);
const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,49}$/;
const MAX_FILTERS = 10;
const MAX_DATA_BYTES = 64 * 1024;

const toPublicRecord = (r: RecordRow) => ({
  id: r.id,
  data: r.data,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

@Injectable()
export class RecordsService {
  constructor(
    private readonly records: RecordsRepository,
    private readonly resources: ResourcesRepository,
  ) {}

  async create(
    projectId: string,
    resourceName: string,
    data: Record<string, unknown>,
    createdBy: string | null,
  ) {
    const resource = await this.getActiveResource(projectId, resourceName);
    const json = this.serialize(data);

    const id = randomUUID();
    await this.records.insert({
      id,
      resourceId: resource.id,
      data: json,
      createdBy,
    });
    return this.get(projectId, resourceName, id);
  }

  async list(
    projectId: string,
    resourceName: string,
    query: Record<string, unknown>,
  ) {
    const resource = await this.getActiveResource(projectId, resourceName);

    const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(query['limit'] ?? '20'), 10) || 20),
    );
    const order =
      String(query['order'] ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const sortParam = String(query['sort'] ?? 'createdAt');
    let sort: SortSpec;
    if (sortParam === 'createdAt')
      sort = { kind: 'column', column: 'created_at' };
    else if (sortParam === 'updatedAt')
      sort = { kind: 'column', column: 'updated_at' };
    else if (FIELD_NAME.test(sortParam))
      sort = { kind: 'field', field: sortParam };
    else throw new BadRequestException('Invalid sort field');

    const filters: [string, string][] = [];
    for (const [key, value] of Object.entries(query)) {
      if (RESERVED_QUERY_KEYS.has(key)) continue;
      if (!FIELD_NAME.test(key)) {
        throw new BadRequestException(`Invalid filter field: ${key}`);
      }
      if (typeof value !== 'string') {
        throw new BadRequestException(`Filter "${key}" must be a single value`);
      }
      filters.push([key, value]);
    }
    if (filters.length > MAX_FILTERS) {
      throw new BadRequestException(`Use at most ${MAX_FILTERS} filters`);
    }

    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      this.records.list(resource.id, filters, sort, order, limit, offset),
      this.records.count(resource.id, filters),
    ]);
    return { items: rows.map(toPublicRecord), total, page, limit };
  }

  async get(projectId: string, resourceName: string, recordId: string) {
    const resource = await this.getActiveResource(projectId, resourceName);
    const record = await this.records.findById(resource.id, recordId);
    if (!record) throw new NotFoundException('Record not found');
    return toPublicRecord(record);
  }

  async update(
    projectId: string,
    resourceName: string,
    recordId: string,
    data: Record<string, unknown>,
  ) {
    const resource = await this.getActiveResource(projectId, resourceName);
    const existing = await this.records.findById(resource.id, recordId);
    if (!existing) throw new NotFoundException('Record not found');

    await this.records.mergeData(resource.id, recordId, this.serialize(data));
    return this.get(projectId, resourceName, recordId);
  }

  async remove(projectId: string, resourceName: string, recordId: string) {
    const resource = await this.getActiveResource(projectId, resourceName);
    const existing = await this.records.findById(resource.id, recordId);
    if (!existing) throw new NotFoundException('Record not found');
    await this.records.remove(resource.id, recordId);
  }

  private serialize(data: Record<string, unknown>): string {
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json) > MAX_DATA_BYTES) {
      throw new BadRequestException('Record data is too large (max 64 KB)');
    }
    return json;
  }

  private async getActiveResource(projectId: string, resourceName: string) {
    const resource = await this.resources.findByName(projectId, resourceName);
    if (!resource) throw new NotFoundException('Resource not found');
    if (resource.status !== 'active')
      throw new ForbiddenException('Resource is disabled');
    return resource;
  }
}
