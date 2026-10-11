import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReportCategory, ReportSeverity } from '../../database/entities/health-report.entity.js';

export class SummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days = 30;
}

export class MapQueryDto extends SummaryQueryDto {
  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @IsOptional()
  @IsEnum(ReportSeverity)
  severity?: ReportSeverity;
}
