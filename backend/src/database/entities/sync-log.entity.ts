import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

/** Audit record of one synchronization batch. Holds counts only, never report content. */
@Entity({ name: 'sync_logs' })
@Index('idx_sync_logs_user_started', ['userId', 'startedAt'])
export class SyncLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 64, nullable: true })
  deviceId: string | null;

  @Column({ name: 'received_count', type: 'int', default: 0 })
  receivedCount: number;

  @Column({ name: 'created_count', type: 'int', default: 0 })
  createdCount: number;

  @Column({ name: 'duplicate_count', type: 'int', default: 0 })
  duplicateCount: number;

  @Column({ name: 'rejected_count', type: 'int', default: 0 })
  rejectedCount: number;

  @Column({ type: 'enum', enum: SyncStatus })
  status: SyncStatus;

  @Column({ name: 'started_at', type: 'timestamptz', precision: 6 })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', precision: 6 })
  completedAt: Date;
}
