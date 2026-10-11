import { IsDateString, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { AUDIT_ACTIONS, type AuditAction } from '../../database/entities/audit-log.entity.js';

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditAction;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  /** A user or report UUID, or a numeric location ID. */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  @Matches(/^[A-Za-z0-9-]+$/)
  targetId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
