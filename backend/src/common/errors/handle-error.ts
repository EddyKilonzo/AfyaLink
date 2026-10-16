import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { currentRequestId } from '../request-context.js';

/**
 * Driver error codes that mean the database cannot be reached: Node socket
 * errors, mysql2 codes, and PostgreSQL SQLSTATEs (class 08 connection
 * exceptions, 28 auth, 3D000 unknown database, 53300 too many connections,
 * 57P01/57P03 shutdown or starting up, 55P03 lock not available).
 */
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_LOCK_WAIT_TIMEOUT',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '28000',
  '28P01',
  '3D000',
  '53300',
  '55P03',
  '57P01',
  '57P03',
]);

/** Unique-key violations: mysql2 and PostgreSQL. */
const UNIQUE_VIOLATION_CODES = new Set(['ER_DUP_ENTRY', '23505']);

const BAD_INPUT_CODES = new Set([
  'ER_NO_REFERENCED_ROW_2',
  'ER_CHECK_CONSTRAINT_VIOLATED',
  'ER_TRUNCATED_WRONG_VALUE',
  'ER_DATA_TOO_LONG',
  'WARN_DATA_TRUNCATED',
  // PostgreSQL: foreign key, check constraint, not-null, bad text/number/date
  // representation, value too long, numeric out of range.
  '23503',
  '23514',
  '23502',
  '22P02',
  '22001',
  '22003',
  '22007',
  '22008',
]);

export function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const direct = (error as { code?: unknown }).code;
  if (typeof direct === 'string') return direct;
  // TypeORM's QueryFailedError keeps the driver error on `driverError`.
  const driver = (error as { driverError?: { code?: unknown } }).driverError?.code;
  return typeof driver === 'string' ? driver : undefined;
}

/** True when the error is a unique-key violation on either supported database. */
export function isUniqueViolation(error: unknown): boolean {
  const code = errorCode(error);
  return code !== undefined && UNIQUE_VIOLATION_CODES.has(code);
}

/**
 * Converts any error into an HttpException. Existing HttpExceptions pass
 * through untouched; database/driver errors become 409/400/503; everything
 * else becomes a generic 500. Only the action name and error code are
 * logged, never SQL, parameters or request bodies, so health data stays out
 * of the logs.
 */
export function toHttpException(error: unknown, logger: Logger, action: string): HttpException {
  if (error instanceof HttpException) return error;

  // The request ID lets a reported error be matched to its log line.
  const requestId = currentRequestId();
  if (requestId) action = `${action} [request ${requestId}]`;

  const code = errorCode(error);
  if (code && UNIQUE_VIOLATION_CODES.has(code)) {
    return new ConflictException('A record with the same unique value already exists.');
  }
  if (code && BAD_INPUT_CODES.has(code)) {
    logger.warn(`${action} rejected by database constraint (${code}).`);
    return new BadRequestException('The submitted data is not valid for this record.');
  }
  if (code && CONNECTION_ERROR_CODES.has(code)) {
    logger.error(`${action} failed: database unreachable (${code}).`);
    return new ServiceUnavailableException('Database is temporarily unavailable. Please retry shortly.');
  }
  if (error instanceof Error && /DataSource is not initialized|Connection is not established/i.test(error.message)) {
    return new ServiceUnavailableException('Database is temporarily unavailable. Please retry shortly.');
  }

  const name = error instanceof Error ? error.name : typeof error;
  logger.error(`${action} failed unexpectedly (${code ?? name}).`);
  return new InternalServerErrorException('Something went wrong. Please try again.');
}
