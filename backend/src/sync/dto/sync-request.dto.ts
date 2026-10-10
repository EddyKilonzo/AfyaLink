import { ArrayMaxSize, IsArray, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const MAX_SYNC_BATCH = 50;

/**
 * Items are validated one by one in SyncService (not here) so a single
 * malformed report is rejected on its own instead of failing the whole batch.
 */
export class SyncRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  deviceId?: string;

  @IsArray()
  @ArrayMaxSize(MAX_SYNC_BATCH)
  @IsObject({ each: true })
  reports: Record<string, unknown>[];
}

export type SyncItemStatus = 'created' | 'duplicate' | 'rejected';

export interface SyncItemResult {
  id: string | null;
  status: SyncItemStatus;
  reason?: string;
}
