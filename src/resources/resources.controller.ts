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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ok, paginated } from '../common/utils/response';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Post()
  @RequirePermissions('resources:create')
  @ApiOperation({
    summary: 'Create a resource (a named collection of records)',
  })
  @ApiResponse({ status: 201, description: 'Resource created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({
    status: 403,
    description: 'You do not have permission to perform this action',
  })
  @ApiResponse({
    status: 409,
    description: 'A resource with this name already exists',
  })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateResourceDto,
  ) {
    return ok(
      'Resource created successfully',
      await this.resources.create(projectId, dto),
    );
  }

  @Get()
  @RequirePermissions('resources:read')
  @ApiOperation({ summary: 'List resources of a project' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'You do not have permission to perform this action',
  })
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { items, total } = await this.resources.list(projectId, query);
    return paginated(
      'Resources retrieved successfully',
      items,
      query.page,
      query.limit,
      total,
    );
  }

  @Get(':resourceId')
  @RequirePermissions('resources:read')
  @ApiOperation({ summary: 'Get one resource' })
  @ApiResponse({ status: 200, description: 'Resource retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async get(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ) {
    return ok(
      'Resource retrieved successfully',
      await this.resources.get(projectId, resourceId),
    );
  }

  @Patch(':resourceId')
  @RequirePermissions('resources:update')
  @ApiOperation({ summary: 'Rename or enable/disable a resource' })
  @ApiResponse({ status: 200, description: 'Resource updated successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({
    status: 409,
    description: 'A resource with this name already exists',
  })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return ok(
      'Resource updated successfully',
      await this.resources.update(projectId, resourceId, dto),
    );
  }

  @Delete(':resourceId')
  @HttpCode(200)
  @RequirePermissions('resources:delete')
  @ApiOperation({ summary: 'Delete a resource and all of its records' })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ) {
    await this.resources.remove(projectId, resourceId);
    return ok('Resource deleted successfully');
  }
}
