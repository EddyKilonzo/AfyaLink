import { registerDecorator, type ValidationOptions } from 'class-validator';

/** bcrypt only uses the first 72 bytes of a password; longer input would be silently truncated. */
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 10;

/** Returns why a password is unacceptable, or null when it meets the policy. */
export function passwordPolicyError(value: unknown): string | null {
  if (typeof value !== 'string') return 'password must be a string';
  if (value.length < PASSWORD_MIN_LENGTH) return `password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) {
    return `password must be at most ${PASSWORD_MAX_BYTES} bytes`;
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'password must contain letters and digits';
  if (value.trim() !== value) return 'password must not start or end with whitespace';
  return null;
}

/** New passwords: 10+ characters, at most 72 bytes, letters and digits. */
export function IsAcceptablePassword(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isAcceptablePassword',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options,
      validator: {
        validate: (value: unknown) => passwordPolicyError(value) === null,
        defaultMessage: (args) => passwordPolicyError(args?.value) ?? 'password is not acceptable',
      },
    });
  };
}

/** ISO date that is not later than now plus a small clock-skew allowance. */
export function IsNotFutureDate(toleranceMs = 10 * 60_000, options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isNotFutureDate',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options,
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string') return false;
          const time = Date.parse(value);
          return Number.isFinite(time) && time <= Date.now() + toleranceMs;
        },
        defaultMessage: (args) => `${args?.property ?? 'date'} must not be in the future`,
      },
    });
  };
}

/** Escapes %, _ and \ so user input is matched literally inside a SQL LIKE pattern. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
