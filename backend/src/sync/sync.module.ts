import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

@Module({
  imports: [ReportsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
