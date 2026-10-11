import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const CODE = /^\d{6}$/;
const CODE_MESSAGE = 'code must be a 6-digit code';

export class MfaSetupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}

export class MfaCodeDto {
  @Matches(CODE, { message: CODE_MESSAGE })
  code: string;
}

export class MfaDisableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;

  @Matches(CODE, { message: CODE_MESSAGE })
  code: string;
}
