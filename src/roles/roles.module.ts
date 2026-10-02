import { Global, Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Global()
@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesRepository],
})
export class RolesModule {}
