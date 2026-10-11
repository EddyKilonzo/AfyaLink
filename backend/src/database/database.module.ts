import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppConfig } from '../config/configuration.js';
import { DatabaseService } from './database.service.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { HealthReport } from './entities/health-report.entity.js';
import { Location } from './entities/location.entity.js';
import { RevokedSession } from './entities/revoked-session.entity.js';
import { SyncLog } from './entities/sync-log.entity.js';
import { User } from './entities/user.entity.js';

export const ENTITIES = [User, Location, HealthReport, SyncLog, AuditLog, RevokedSession];

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const db = config.get('db', { infer: true });
        return {
          type: 'mysql' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          entities: ENTITIES,
          // Schema is owned by SQL migrations in backend/database/migrations.
          synchronize: false,
          // Query logging is off so health data never reaches the logs.
          logging: false,
          timezone: 'Z',
          charset: 'utf8mb4',
          manualInitialization: true,
        };
      },
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule, DatabaseService],
})
export class DatabaseModule {}
