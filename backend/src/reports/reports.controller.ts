import { Body, Controller, Get, Logger, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsQueryDto } from './dto/list-reports.dto.js';
import { UpdateReportStatusDto } from './dto/update-report-status.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@Roles(UserRole.CHV, UserRole.ADMIN)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser, @Query() query: ListReportsQueryDto) {
    try {
      return await this.reportsService.list(user, query);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /reports');
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

  /** ADMIN review: SUBMITTED -> REVIEWED -> ACTIONED (forward only). */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @CurrentUser() admin: SessionUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    try {
      return await this.reportsService.updateStatus(admin, id, dto);
    } catch (error) {
      throw toHttpException(error, this.logger, 'PATCH /reports/:id/status');
    }
  }
}
