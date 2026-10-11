import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.login_failed',
  'auth.logout_all',
  'auth.password_change',
  'auth.mfa_enable',
  'auth.mfa_disable',
  'user.create',
  'user.update',
  'user.password_reset',
  'user.mfa_reset',
  'location.create',
  'report.update',
  'report.review',
  'report.export',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditTargetType = 'user' | 'report' | 'location';

/** Scalar values only: identifiers, field names, counts. Never report content or secrets. */
export type AuditDetails = Record<string, string | number | boolean | null>;

/** Append-only: the API has no code path that updates or deletes these rows. */
@Entity({ name: 'audit_logs' })
@Index('idx_audit_created', ['createdAt'])
@Index('idx_audit_actor_created', ['actorId', 'createdAt'])
@Index('idx_audit_action_created', ['action', 'createdAt'])
@Index('idx_audit_target', ['targetType', 'targetId'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'actor_id', type: 'char', length: 36, nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 48 })
  action: AuditAction;

  @Column({ name: 'target_type', type: 'varchar', length: 24, nullable: true })
  targetType: AuditTargetType | null;

  @Column({ name: 'target_id', type: 'varchar', length: 36, nullable: true })
  targetId: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  requestId: string | null;

  @Column({ type: 'json', nullable: true })
  details: AuditDetails | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
