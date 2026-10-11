import { Body, Controller, Get, Logger, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuditService } from '../audit/audit.service.js';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsQueryDto } from './dto/list-reports.dto.js';
import { UpdateReportDto } from './dto/update-report.dto.js';
import { UpdateReportStatusDto } from './dto/update-report-status.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@Roles(UserRole.CHV, UserRole.ADMIN)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@CurrentUser() user: SessionUser, @Query() query: ListReportsQueryDto) {
    try {
      return await this.reportsService.list(user, query);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /reports');
    }
  }

  /**
   * ADMIN: CSV of reports matching the list filters (paging is ignored; at most
   * 10 000 rows). Declared before `:id` so "export" is not parsed as an ID.
   */
  @Get('export')
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async export(
    @CurrentUser() admin: SessionUser,
    @Query() query: ListReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    try {
      const { csv, rows } = await this.reportsService.exportCsv(admin, query);
      await this.audit.record('report.export', {
        actorId: admin.id,
        details: {
          rows,
          category: query.category ?? null,
          severity: query.severity ?? null,
          status: query.status ?? null,
          locationId: query.locationId ?? null,
          chvId: query.chvId ?? null,
          from: query.from ?? null,
          to: query.to ?? null,
        },
      });
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="afyalink-reports-${stamp}.csv"`);
      // The byte-order mark makes Excel read the file as UTF-8.
      return `﻿${csv}`;
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /reports/export');
    }
  }

  @Get(':id')
  async findOne(@CurrentUser() user: SessionUser, @Param('id', new ParseUUIDPipe()) id: string) {
    try {
      return await this.reportsService.findOne(user, id);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /reports/:id');
    }
  }

  /** 201 when created, 200 when the same report ID was already stored (safe retry). */
  @Post()
  async create(
    @CurrentUser() user: SessionUser,
    @Body() dto: CreateReportDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { outcome, report } = await this.reportsService.createIdempotent(user, dto);
      res.status(outcome === 'created' ? 201 : 200);
      return { outcome, report };
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /reports');
    }
  }

  /** CHV correction of their own report while it is SUBMITTED and less than 72 hours old. */
  @Patch(':id')
  @Roles(UserRole.CHV)
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReportDto,
  ) {
    try {
      const { report, fields } = await this.reportsService.updateOwn(user, id, dto);
      await this.audit.record('report.update', {
        actorId: user.id,
        targetType: 'report',
        targetId: id,
        details: { fields: fields.join(',') },
      });
      return report;
    } catch (error) {
      throw toHttpException(error, this.logger, 'PATCH /reports/:id');
    }
  }

  /** ADMIN review: SUBMITTED -> REVIEWED -> ACTIONED (forward only). */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @CurrentUser() admin: SessionUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    try {
      const report = await this.reportsService.updateStatus(admin, id, dto);
      await this.audit.record('report.review', {
        actorId: admin.id,
        targetType: 'report',
        targetId: id,
        details: { status: dto.status },
      });
      return report;
    } catch (error) {
      throw toHttpException(error, this.logger, 'PATCH /reports/:id/status');
    }
  }
}
