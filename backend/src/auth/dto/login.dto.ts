import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  /** Six-digit authenticator code; required only when two-factor sign-in is enabled. */
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit code' })
  otp?: string;
}
