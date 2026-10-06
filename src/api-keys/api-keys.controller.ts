import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/api-keys')
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Post()
  @RequirePermissions('api-keys:create')
  @ApiOperation({
    summary: 'Create an API key (the full key is shown only once)',
  })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({
    status: 403,
    description: 'You do not have permission to perform this action',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return ok(
      'API key created successfully. Copy it now, it will not be shown again.',
      await this.keys.create(projectId, dto),
    );
  }

  @Get()
  @RequirePermissions('api-keys:read')
  @ApiOperation({ summary: 'List API keys (without the key values)' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'You do not have permission to perform this action',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { items, total } = await this.keys.list(projectId, query);
    return paginated(
      'API keys retrieved successfully',
      items,
      query.page,
      query.limit,
      total,
    );
  }

  @Post(':keyId/revoke')
  @HttpCode(200)
  @RequirePermissions('api-keys:delete')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({
    status: 403,
    description: 'You do not have permission to perform this action',
  })
  @ApiResponse({ status: 404, description: 'Project or API key not found' })
  @ApiResponse({ status: 409, description: 'API key is already revoked' })
  async revoke(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
  ) {
    return ok(
      'API key revoked successfully',
      await this.keys.revoke(projectId, keyId),
    );
  }

  @Delete(':keyId')
  @HttpCode(200)
  @RequirePermissions('api-keys:delete')
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'You do not have permission to perform this action',
  })
  @ApiResponse({ status: 404, description: 'Project or API key not found' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
  ) {
    await this.keys.remove(projectId, keyId);
    return ok('API key deleted successfully');
  }
}
