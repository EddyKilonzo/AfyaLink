import { Controller, Get, Logger, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/auth.decorators.js';
import { paginate, PaginationQueryDto } from '../common/dto/pagination.dto.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async list(@Query() query: PaginationQueryDto) {
    try {
      const { items, total } = await this.usersService.list(query.page, query.limit);
      return paginate(items, total, query.page, query.limit);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /users');
    }
  }
}
