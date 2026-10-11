import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportStatus } from '../../database/entities/health-report.entity.js';

/** ADMIN review action. Reports only move forward: SUBMITTED -> REVIEWED -> ACTIONED. */
export class UpdateReportStatusDto {
  @IsIn([ReportStatus.REVIEWED, ReportStatus.ACTIONED])
  status: ReportStatus.REVIEWED | ReportStatus.ACTIONED;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
