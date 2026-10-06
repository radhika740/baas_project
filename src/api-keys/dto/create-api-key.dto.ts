import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const KEY_TYPES = ['public', 'secret'] as const;

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Mobile app key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ enum: KEY_TYPES, default: 'public' })
  @IsOptional()
  @IsIn(KEY_TYPES)
  keyType?: (typeof KEY_TYPES)[number];

  @ApiPropertyOptional({
    example: '2027-01-01T00:00:00.000Z',
    description: 'Optional expiry date (must be in the future)',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
