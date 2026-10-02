import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMobilePhone } from 'class-validator';

export const ASSIGNABLE_ROLES = ['Admin', 'Developer', 'Viewer'] as const;

export class AddMemberDto {
  @ApiProperty({
    example: '9123456780',
    description: 'Phone of a registered user',
  })
  @IsMobilePhone('en-IN')
  phone!: string;

  @ApiProperty({ enum: ASSIGNABLE_ROLES, example: 'Developer' })
  @IsIn(ASSIGNABLE_ROLES)
  role!: (typeof ASSIGNABLE_ROLES)[number];
}
