import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ok } from '../common/utils/response';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async me(@CurrentUser() user: AuthUser) {
    return ok(
      'Profile retrieved successfully',
      await this.users.getProfile(user.id),
    );
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return ok(
      'Profile updated successfully',
      await this.users.updateProfile(user.id, dto),
    );
  }

  @Delete('me')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete my account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  @ApiResponse({ status: 409, description: 'User still owns projects' })
  async remove(@CurrentUser() user: AuthUser) {
    await this.users.deleteAccount(user.id);
    return ok('Account deleted successfully');
  }
}
