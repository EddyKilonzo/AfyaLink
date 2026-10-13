import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'locations' })
export class Location {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 80 })
  county: string;

  @Column({ name: 'sub_county', type: 'varchar', length: 80 })
  subCounty: string;

  @Column({ type: 'varchar', length: 80 })
  ward: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  village: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  latitude: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  longitude: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 6 })
  createdAt: Date;
}
