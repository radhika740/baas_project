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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ok, paginated } from '../common/utils/response';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid project data' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return ok(
      'Project created successfully',
      await this.projects.create(user.id, dto),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List my projects' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    const { items, total } = await this.projects.list(user.id, query);
    return paginated(
      'Projects retrieved successfully',
      items,
      query.page,
      query.limit,
      total,
    );
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get one of my projects' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async get(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return ok(
      'Project retrieved successfully',
      await this.projects.get(user.id, projectId),
    );
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update a project (owner only)' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 403, description: 'Only the owner can update' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return ok(
      'Project updated successfully',
      await this.projects.update(user.id, projectId, dto),
    );
  }

  @Delete(':projectId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a project (owner only)' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only the owner can delete' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    await this.projects.remove(user.id, projectId);
    return ok('Project deleted successfully');
  }
}
