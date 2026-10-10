import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReportDto } from './create-report.dto.js';

function base(): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    id: '3f1e4c2a-8b7d-4e6f-9a1b-2c3d4e5f6a7b',
    category: 'DISEASE_CASE',
    conditionName: 'Malaria',
    severity: 'HIGH',
    casesCount: 3,
    ageGroup: 'UNDER_5',
    observedAt: now,
    clientCreatedAt: now,
  };
}

async function errorsFor(input: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateReportDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
}

describe('CreateReportDto validation', () => {
  it('accepts a minimal valid report', async () => {
    expect(await errorsFor(base())).toEqual([]);
  });

  it('requires a UUID v4 id', async () => {
    expect(await errorsFor({ ...base(), id: '123' })).toContain('id');
  });

  it('rejects unknown enum values', async () => {
    const props = await errorsFor({ ...base(), category: 'ALIENS', severity: 'MEH', ageGroup: 'OLD' });
    expect(props).toEqual(expect.arrayContaining(['category', 'severity', 'ageGroup']));
  });

  it('bounds the case count', async () => {
    expect(await errorsFor({ ...base(), casesCount: 0 })).toContain('casesCount');
    expect(await errorsFor({ ...base(), casesCount: 10_001 })).toContain('casesCount');
  });

  it('validates coordinates', async () => {
    expect(await errorsFor({ ...base(), latitude: 120, longitude: 38 })).toContain('latitude');
  });

  it('rejects unexpected fields such as chvId (mass assignment)', async () => {
    expect(await errorsFor({ ...base(), chvId: 'someone-else' })).toContain('chvId');
  });

  it('limits free-text length', async () => {
    expect(await errorsFor({ ...base(), notes: 'x'.repeat(2001) })).toContain('notes');
  });
});
