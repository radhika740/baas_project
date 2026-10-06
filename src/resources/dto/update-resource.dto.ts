import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { RESOURCE_NAME_REGEX } from './create-resource.dto';

export const RESOURCE_STATUSES = ['active', 'disabled'] as const;

export class UpdateResourceDto {
  @ApiPropertyOptional({ example: 'todos' })
  @IsOptional()
  @IsString()
  @Matches(RESOURCE_NAME_REGEX, {
    message:
      'name must be 2-50 characters: lowercase letters, digits, "_" or "-", starting with a letter',
  })
  name?: string;

  @ApiPropertyOptional({ enum: RESOURCE_STATUSES })
  @IsOptional()
  @IsIn(RESOURCE_STATUSES)
  status?: (typeof RESOURCE_STATUSES)[number];
}
