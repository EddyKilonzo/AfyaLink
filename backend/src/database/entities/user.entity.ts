import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Location } from './location.entity.js';

export enum UserRole {
  CHV = 'CHV',
  ADMIN = 'ADMIN',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CHV })
  role: UserRole;

  @Column({ name: 'location_id', type: 'int', unsigned: true, nullable: true })
  locationId: number | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location?: Relation<Location> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled: boolean;

  /** AES-256-GCM encrypted TOTP secret; never selected by default. */
  @Column({ name: 'mfa_secret', type: 'varchar', length: 255, nullable: true, select: false })
  mfaSecret: string | null;

  /** Last accepted TOTP time step, so a code cannot be used twice. */
  @Column({ name: 'mfa_last_step', type: 'bigint', unsigned: true, nullable: true, select: false })
  mfaLastStep: string | null;

  @Column({ name: 'last_login_at', type: 'datetime', precision: 6, nullable: true })
  lastLoginAt: Date | null;

  /** Sessions issued before this instant are rejected (set on password change/reset, deactivation, role change). */
  @Column({ name: 'tokens_valid_after', type: 'datetime', precision: 6, nullable: true })
  tokensValidAfter: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
