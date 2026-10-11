import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import {
  ReportCategory,
  ReportSeverity,
  ReportStatus,
} from '../../database/entities/health-report.entity.js';

export class ListReportsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @IsOptional()
  @IsEnum(ReportSeverity)
  severity?: ReportSeverity;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;

  /** ADMIN only; ignored for CHVs, who always see just their own reports. */
  @IsOptional()
  @IsUUID()
  chvId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
