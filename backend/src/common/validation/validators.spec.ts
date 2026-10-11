import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { escapeLike, IsNotFutureDate, passwordPolicyError } from './validators.js';

describe('passwordPolicyError', () => {
  it('accepts a long password with letters and digits', () => {
    expect(passwordPolicyError('Correct7horse')).toBeNull();
  });

  it.each([
    ['too short', 'Abc12345'],
    ['no digits', 'OnlyLettersHere'],
    ['no letters', '12345678901'],
    ['leading whitespace', ' Spaced123456'],
    ['over 72 bytes', `a1${'b'.repeat(71)}`],
    ['over 72 bytes in multi-byte characters', `a1${'é'.repeat(36)}`],
  ])('rejects a password that is %s', (_label, value) => {
    expect(passwordPolicyError(value)).not.toBeNull();
  });

  it('rejects non-strings', () => {
    expect(passwordPolicyError(12345678901)).not.toBeNull();
  });
});

describe('IsNotFutureDate', () => {
  class Dto {
    @IsNotFutureDate(60_000)
    at: string;
  }
  const errorsFor = async (at: unknown) => (await validate(plainToInstance(Dto, { at }))).length;

  it('accepts past dates and small clock skew', async () => {
    expect(await errorsFor(new Date(Date.now() - 86_400_000).toISOString())).toBe(0);
    expect(await errorsFor(new Date(Date.now() + 30_000).toISOString())).toBe(0);
  });

  it('rejects dates beyond the tolerance and unparseable values', async () => {
    expect(await errorsFor(new Date(Date.now() + 120_000).toISOString())).toBe(1);
    expect(await errorsFor('not a date')).toBe(1);
  });
});

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});
