import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { ListLocationsQueryDto } from './dto/list-locations.dto.js';
import { LocationsService } from './locations.service.js';

@Controller('locations')
export class LocationsController {
  private readonly logger = new Logger(LocationsController.name);

  constructor(
    private readonly locationsService: LocationsService,
    private readonly audit: AuditService,
  ) {}

  /** Any signed-in user: CHVs pick a location on the report form; the map uses the coordinates. */
  @Get()
  @Roles(UserRole.CHV, UserRole.ADMIN)
  async list(@Query() query: ListLocationsQueryDto) {
    try {
      return { items: await this.locationsService.list(query.county) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /locations');
    }
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@CurrentUser() admin: SessionUser, @Body() dto: CreateLocationDto) {
    try {
      const location = await this.locationsService.create(dto);
      await this.audit.record('location.create', { actorId: admin.id, targetType: 'location', targetId: location.id });
      return location;
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /locations');
    }
  }
}
