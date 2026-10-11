import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Location } from './location.entity.js';
import { User } from './user.entity.js';

export enum ReportCategory {
  DISEASE_CASE = 'DISEASE_CASE',
  MATERNAL_HEALTH = 'MATERNAL_HEALTH',
  CHILD_HEALTH = 'CHILD_HEALTH',
  NUTRITION = 'NUTRITION',
  WATER_SANITATION = 'WATER_SANITATION',
  DEATH = 'DEATH',
  OTHER = 'OTHER',
}

export enum ReportSeverity {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AgeGroup {
  UNDER_5 = 'UNDER_5',
  AGE_5_17 = 'AGE_5_17',
  AGE_18_59 = 'AGE_18_59',
  AGE_60_PLUS = 'AGE_60_PLUS',
  MIXED = 'MIXED',
}

export enum ReportStatus {
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  ACTIONED = 'ACTIONED',
}

/**
 * A community health report. The primary key is a client-generated UUID so
 * that a report created offline keeps the same identity across sync retries,
 * which is what makes synchronization idempotent.
 */
@Entity({ name: 'health_reports' })
@Index('idx_reports_chv_observed', ['chvId', 'observedAt'])
@Index('idx_reports_category_observed', ['category', 'observedAt'])
export class HealthReport {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'chv_id', type: 'char', length: 36 })
  chvId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'chv_id' })
  chv?: Relation<User>;

  @Column({ name: 'location_id', type: 'int', unsigned: true, nullable: true })
  locationId: number | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location?: Relation<Location> | null;

  @Column({ type: 'enum', enum: ReportCategory })
  category: ReportCategory;

  @Column({ name: 'condition_name', type: 'varchar', length: 120 })
  conditionName: string;

  @Column({ type: 'enum', enum: ReportSeverity, default: ReportSeverity.LOW })
  severity: ReportSeverity;

  @Column({ name: 'cases_count', type: 'int', unsigned: true, default: 1 })
  casesCount: number;

  @Column({ name: 'age_group', type: 'enum', enum: AgeGroup, default: AgeGroup.MIXED })
  ageGroup: AgeGroup;

  @Column({ type: 'json', nullable: true })
  symptoms: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: string | null;

  @Column({ name: 'observed_at', type: 'datetime', precision: 6 })
  observedAt: Date;

  @Column({ name: 'client_created_at', type: 'datetime', precision: 6 })
  clientCreatedAt: Date;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.SUBMITTED })
  status: ReportStatus;

  @Column({ name: 'reviewed_by', type: 'char', length: 36, nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy?: Relation<User> | null;

  @Column({ name: 'reviewed_at', type: 'datetime', precision: 6, nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_note', type: 'varchar', length: 500, nullable: true })
  reviewNote: string | null;

  @CreateDateColumn({ name: 'received_at', type: 'datetime', precision: 6 })
  receivedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
