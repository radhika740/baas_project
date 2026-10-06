import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export const RESOURCE_NAME_REGEX = /^[a-z][a-z0-9_-]{1,49}$/;

export class CreateResourceDto {
  @ApiProperty({
    example: 'tasks',
    description:
      'Lowercase letters, digits, "_" or "-". Starts with a letter. 2 to 50 characters.',
  })
  @IsString()
  @Matches(RESOURCE_NAME_REGEX, {
    message:
      'name must be 2-50 characters: lowercase letters, digits, "_" or "-", starting with a letter',
  })
  name!: string;
}
