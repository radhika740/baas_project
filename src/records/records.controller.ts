import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { ProjectAccessGuard } from '../common/guards/project-access.guard';
import type { ProjectAccessRequest } from '../common/interfaces/project-access.interface';
import { ok, paginated } from '../common/utils/response';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { RecordsService } from './records.service';

@ApiTags('Records')
@ApiBearerAuth()
@ApiSecurity('api-key')
@UseGuards(ProjectAccessGuard)
@Controller('projects/:projectId/resources/:resourceName/records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Post()
  @RequirePermissions('records:create')
  @ApiOperation({ summary: 'Create a record (user token or secret API key)' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid token / API key',
  })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to perform this action',
  })
  @ApiResponse({ status: 404, description: 'Project or resource not found' })
  async create(
    @Req() req: ProjectAccessRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceName') resourceName: string,
    @Body() dto: CreateRecordDto,
  ) {
    const createdBy = req.user?.id ?? null;
    return ok(
      'Record created successfully',
      await this.records.create(projectId, resourceName, dto.data, createdBy),
    );
  }

  @Get()
  @RequirePermissions('records:read')
  @ApiOperation({
    summary: 'List records with pagination, simple filtering and sorting',
    description:
      'Any other query parameter filters on a field inside data, for example ?completed=false. Use sort=createdAt, updatedAt or a data field, and order=asc or desc.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'sort', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'completed',
    required: false,
    description: 'Example filter on data.completed',
  })
  @ApiQuery({
    name: 'title',
    required: false,
    description: 'Example filter on data.title',
  })
  @ApiResponse({ status: 200, description: 'Records retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid token / API key',
  })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to perform this action',
  })
  @ApiResponse({ status: 404, description: 'Project or resource not found' })
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceName') resourceName: string,
    @Query() query: Record<string, unknown>,
  ) {
    const { items, total, page, limit } = await this.records.list(
      projectId,
      resourceName,
      query,
    );
    return paginated(
      'Records retrieved successfully',
      items,
      page,
      limit,
      total,
    );
  }

  @Get(':recordId')
  @RequirePermissions('records:read')
  @ApiOperation({ summary: 'Get one record' })
  @ApiResponse({ status: 200, description: 'Record retrieved successfully' })
  @ApiResponse({
    status: 404,
    description: 'Project, resource or record not found',
  })
  async get(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceName') resourceName: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return ok(
      'Record retrieved successfully',
      await this.records.get(projectId, resourceName, recordId),
    );
  }

  @Patch(':recordId')
  @RequirePermissions('records:update')
  @ApiOperation({
    summary: 'Update fields of a record (merged into existing data)',
  })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to perform this action',
  })
  @ApiResponse({
    status: 404,
    description: 'Project, resource or record not found',
  })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceName') resourceName: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return ok(
      'Record updated successfully',
      await this.records.update(projectId, resourceName, recordId, dto.data),
    );
  }

  @Delete(':recordId')
  @HttpCode(200)
  @RequirePermissions('records:delete')
  @ApiOperation({ summary: 'Delete a record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to perform this action',
  })
  @ApiResponse({
    status: 404,
    description: 'Project, resource or record not found',
  })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceName') resourceName: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    await this.records.remove(projectId, resourceName, recordId);
    return ok('Record deleted successfully');
  }
}
