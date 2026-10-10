import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AgeGroup,
  ReportCategory,
  ReportSeverity,
} from '../../database/entities/health-report.entity.js';

/**
 * Payload for a health report. `id` is generated on the device when the
 * report is first saved (online or offline) and never changes, so the server
 * can recognise retries of the same report.
 */
export class CreateReportDto {
  @IsUUID('4')
  id: string;

  @IsEnum(ReportCategory)
  category: ReportCategory;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  conditionName: string;

  @IsEnum(ReportSeverity)
  severity: ReportSeverity;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  casesCount: number;

  @IsEnum(AgeGroup)
  ageGroup: AgeGroup;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  symptoms?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @IsDateString()
  observedAt: string;

  @IsDateString()
  clientCreatedAt: string;
}
