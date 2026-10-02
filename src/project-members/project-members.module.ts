import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersRepository } from './project-members.repository';
import { ProjectMembersService } from './project-members.service';

@Module({
  imports: [UsersModule],
  controllers: [ProjectMembersController],
  providers: [ProjectMembersService, ProjectMembersRepository],
  exports: [ProjectMembersRepository],
})
export class ProjectMembersModule {}
