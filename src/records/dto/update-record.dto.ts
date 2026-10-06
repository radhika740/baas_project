import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateRecordDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Fields to change. They are merged into the existing data. A null value removes a field.',
    example: { completed: true },
  })
  @IsObject()
  data!: Record<string, unknown>;
}
