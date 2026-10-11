import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { IsAcceptablePassword } from '../../common/validation/validators.js';
import { UserRole } from '../../database/entities/user.entity.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const PHONE = /^\+?[0-9]{7,15}$/;
const NAME = /^[\p{L}\p{M} .'-]+$/u;

export class CreateUserDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(NAME, { message: 'fullName may only contain letters, spaces, apostrophes, dots and hyphens' })
  fullName: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsOptional()
  @Transform(trim)
  @Matches(PHONE, { message: 'phone must be 7-15 digits, optionally starting with +' })
  phone?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;

  @IsAcceptablePassword()
  password: string;
}

/**
 * Every field optional (IsOptional also lets `null` through: it clears phone or
 * location and is ignored for the other fields). Email and password change elsewhere.
 */
export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(NAME, { message: 'fullName may only contain letters, spaces, apostrophes, dots and hyphens' })
  fullName?: string;

  @IsOptional()
  @Transform(trim)
  @Matches(PHONE, { message: 'phone must be 7-15 digits, optionally starting with +' })
  phone?: string | null;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @IsAcceptablePassword()
  password: string;
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  /** Case-insensitive match on name or email. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  q?: string;
}
