import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class CreateRecordDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      title: 'First Task',
      description: 'Create the first task',
      completed: false,
    },
  })
  @IsObject()
  data!: Record<string, unknown>;
}
