import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isUniqueViolation, toHttpException } from './handle-error.js';

describe('toHttpException', () => {
  const logger = new Logger('test');
  beforeAll(() => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  it('passes HttpExceptions through unchanged', () => {
    const original = new NotFoundException('nope');
    expect(toHttpException(original, logger, 'x')).toBe(original);
  });

  it('maps duplicate keys to 409', () => {
    expect(toHttpException({ code: 'ER_DUP_ENTRY' }, logger, 'x')).toBeInstanceOf(ConflictException);
  });

  it('maps PostgreSQL SQLSTATEs the same way as MySQL codes', () => {
    expect(toHttpException({ driverError: { code: '23505' } }, logger, 'x')).toBeInstanceOf(ConflictException);
    expect(toHttpException({ driverError: { code: '23503' } }, logger, 'x')).toBeInstanceOf(BadRequestException);
    expect(toHttpException({ code: '57P03' }, logger, 'x')).toBeInstanceOf(ServiceUnavailableException);
    expect(isUniqueViolation({ driverError: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ code: 'ER_DUP_ENTRY' })).toBe(true);
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
  });

  it('maps TypeORM driverError codes for constraint violations to 400', () => {
    const err = { driverError: { code: 'ER_NO_REFERENCED_ROW_2' } };
    expect(toHttpException(err, logger, 'x')).toBeInstanceOf(BadRequestException);
  });

  it('maps connection failures to 503', () => {
    expect(toHttpException({ code: 'ECONNREFUSED' }, logger, 'x')).toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('hides unknown errors behind a generic 500', () => {
    const result = toHttpException(new Error('SELECT secret FROM patients'), logger, 'x');
    expect(result).toBeInstanceOf(InternalServerErrorException);
    expect(JSON.stringify(result.getResponse())).not.toContain('patients');
  });
});
