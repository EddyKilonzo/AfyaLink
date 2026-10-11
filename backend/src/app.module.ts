import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { SessionGuard } from './common/guards/session.guard.js';
import { loadConfiguration, type AppConfig } from './config/configuration.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { ReportsModule } from './reports/reports.module.js';
import { SyncModule } from './sync/sync.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Backend-local .env first, then the shared root .env.
      envFilePath: ['.env', '../.env'],
      load: [loadConfiguration],
    }),
    // Per-client-IP limits: a burst limit plus a sustained per-minute limit.
    // Individual routes (login, csrf, sync) tighten `default` with @Throttle.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const enabled = config.get('rateLimitEnabled', { infer: true });
        return {
          throttlers: [
            { name: 'burst', ttl: 10_000, limit: 30 },
            { name: 'default', ttl: 60_000, limit: 120 },
          ],
          skipIf: () => !enabled,
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ReportsModule,
    AnalyticsModule,
    SyncModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guards run in this order: rate limit -> CSRF -> session -> role.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
