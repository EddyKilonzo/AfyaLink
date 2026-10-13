import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** A logged-out session ID, kept until the token would have expired anyway. */
@Entity({ name: 'revoked_sessions' })
@Index('idx_revoked_expires', ['expiresAt'])
export class RevokedSession {
  @PrimaryColumn({ type: 'uuid' })
  jti: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'expires_at', type: 'timestamptz', precision: 6 })
  expiresAt: Date;

  @CreateDateColumn({ name: 'revoked_at', type: 'timestamptz', precision: 6 })
  revokedAt: Date;
}
