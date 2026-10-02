import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ok } from '../common/utils/response';
import { RolesService } from './roles.service';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'List all available permissions' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async permissions() {
    return ok(
      'Permissions retrieved successfully',
      await this.roles.listPermissions(),
    );
  }

  @Get('projects/:projectId/roles')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: "List a project's roles and their permissions" })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'You do not have permission to perform this action',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async list(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return ok(
      'Roles retrieved successfully',
      await this.roles.listForProject(projectId),
    );
  }
}
