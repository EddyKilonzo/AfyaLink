import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import {
  ReportCategory,
  ReportSeverity,
} from '../../database/entities/health-report.entity.js';

export class ListReportsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @IsOptional()
  @IsEnum(ReportSeverity)
  severity?: ReportSeverity;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
