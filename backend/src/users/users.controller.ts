import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { CreateUserDto, ListUsersQueryDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

/** User administration. Every route is ADMIN-only. */
@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Query() query: ListUsersQueryDto) {
    try {
      return await this.usersService.list(query);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /users');
    }
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      return { user: await this.usersService.getPublic(id) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /users/:id');
    }
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async create(@Body() dto: CreateUserDto) {
    try {
      return { user: await this.usersService.create(dto) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /users');
    }
  }

  @Patch(':id')
  async update(
    @CurrentUser() admin: SessionUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    try {
      return { user: await this.usersService.update(admin, id, dto) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'PATCH /users/:id');
    }
  }

  /** Sets a new password and signs the user out everywhere. */
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetPassword(
    @CurrentUser() admin: SessionUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    try {
      await this.usersService.resetPassword(admin, id, dto.password);
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /users/:id/reset-password');
    }
  }
}
