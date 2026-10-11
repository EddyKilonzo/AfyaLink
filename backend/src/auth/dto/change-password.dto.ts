import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsAcceptablePassword } from '../../common/validation/validators.js';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword: string;

  @IsAcceptablePassword()
  newPassword: string;
}
