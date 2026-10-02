import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Demo Project' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;
}
