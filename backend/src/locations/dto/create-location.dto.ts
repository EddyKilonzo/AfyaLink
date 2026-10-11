import { Transform, Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const PLACE = /^[\p{L}\p{M}\p{N} .,'()/-]+$/u;
const PLACE_MESSAGE = 'may only contain letters, digits, spaces and . , \' ( ) / -';

export class CreateLocationDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(PLACE, { message: `county ${PLACE_MESSAGE}` })
  county: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(PLACE, { message: `subCounty ${PLACE_MESSAGE}` })
  subCounty: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(PLACE, { message: `ward ${PLACE_MESSAGE}` })
  ward: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(PLACE, { message: `village ${PLACE_MESSAGE}` })
  village?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
