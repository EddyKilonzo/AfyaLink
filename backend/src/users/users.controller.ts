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
import { AuditService } from '../audit/audit.service.js';
import { MfaService } from '../auth/mfa.service.js';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { MailService } from '../mail/mail.service.js';
import { CreateUserDto, ListUsersQueryDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto.js';
import { UsersService, type PublicUser } from './users.service.js';

/** User administration. Every route is ADMIN-only. */
@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mfa: MfaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

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
  async create(@CurrentUser() admin: SessionUser, @Body() dto: CreateUserDto) {
    try {
      const user = await this.usersService.create(dto);
      await this.audit.record('user.create', {
        actorId: admin.id,
        targetType: 'user',
        targetId: user.id,
        details: { role: user.role },
      });
      // The initial password is never emailed; the admin hands it over directly.
      this.mail.notifyAccount(user, { kind: 'account_created', role: user.role });
      return { user };
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
      // Read the previous state only when a notifiable field is in the request.
      const before = dto.isActive !== undefined || dto.role !== undefined ? await this.usersService.getPublic(id) : null;
      const user = await this.usersService.update(admin, id, dto);
      if (before) this.notifyAccountChanges(before, user);
      await this.audit.record('user.update', {
        actorId: admin.id,
        targetType: 'user',
        targetId: id,
        details: {
          fields: Object.keys(dto).join(','),
          role: dto.role ?? null,
          isActive: dto.isActive ?? null,
        },
      });
      return { user };
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
      await this.audit.record('user.password_reset', { actorId: admin.id, targetType: 'user', targetId: id });
      await this.notifyById(id, 'password_reset_by_admin');
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /users/:id/reset-password');
    }
  }

  /** Turns off two-factor sign-in for a user who lost their device, and signs them out everywhere. */
  @Post(':id/reset-mfa')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetMfa(@CurrentUser() admin: SessionUser, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    try {
      await this.mfa.reset(id);
      await this.audit.record('user.mfa_reset', { actorId: admin.id, targetType: 'user', targetId: id });
      await this.notifyById(id, 'mfa_reset_by_admin');
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /users/:id/reset-mfa');
    }
  }

  private notifyAccountChanges(before: PublicUser, after: PublicUser): void {
    if (before.isActive && !after.isActive) this.mail.notifyAccount(after, { kind: 'account_deactivated' });
    else if (!before.isActive && after.isActive) this.mail.notifyAccount(after, { kind: 'account_reactivated' });
    // A deactivated user is not told about a role change they cannot use.
    if (after.isActive && before.role !== after.role) this.mail.notifyAccount(after, { kind: 'role_changed', role: after.role });
  }

  /** Looks up the address after the action succeeded; a lookup failure must not fail the request. */
  private async notifyById(id: string, kind: 'password_reset_by_admin' | 'mfa_reset_by_admin'): Promise<void> {
    try {
      this.mail.notifyAccount(await this.usersService.getPublic(id), { kind });
    } catch {
      this.logger.warn(`Could not load user for ${kind} email.`);
    }
  }
}
