import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import type { DatabaseService } from '../database/database.service.js';
import type { HealthReport } from '../database/entities/health-report.entity.js';
import { SyncStatus, type SyncLog } from '../database/entities/sync-log.entity.js';
import { UserRole } from '../database/entities/user.entity.js';
import { ReportsService } from '../reports/reports.service.js';
import { SyncService } from './sync.service.js';

/** In-memory stand-in for the health_reports table keyed by primary key. */
function fakeReportRepo() {
  const rows = new Map<string, HealthReport>();
  return {
    rows,
    findOne: vi.fn(async ({ where: { id } }: { where: { id: string } }) => rows.get(id) ?? null),
    findOneOrFail: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      const row = rows.get(id);
      if (!row) throw new Error('not found');
      return row;
    }),
    create: vi.fn((data: HealthReport) => data),
    insert: vi.fn(async (data: HealthReport) => {
      if (rows.has(data.id)) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      rows.set(data.id, data);
    }),
  };
}

function validReport(id: string = randomUUID()) {
  const now = new Date().toISOString();
  return {
    id,
    category: 'DISEASE_CASE',
    conditionName: 'Malaria',
    severity: 'MODERATE',
    casesCount: 2,
    ageGroup: 'UNDER_5',
    observedAt: now,
    clientCreatedAt: now,
  };
}

describe('SyncService', () => {
  const chv: SessionUser = { id: randomUUID(), role: UserRole.CHV, email: 'chv@afyalink.test' };
  const otherChv: SessionUser = { id: randomUUID(), role: UserRole.CHV, email: 'other@afyalink.test' };
  const db = { assertReady: vi.fn() } as unknown as DatabaseService;
  let repo: ReturnType<typeof fakeReportRepo>;
  let service: SyncService;

  function build(logs: Partial<Repository<SyncLog>> = { insert: vi.fn() }) {
    const reports = new ReportsService(repo as unknown as Repository<HealthReport>, db);
    return new SyncService(reports, db, logs as Repository<SyncLog>);
  }

  beforeEach(() => {
    repo = fakeReportRepo();
    service = build();
  });

  it('creates new reports and reports SUCCESS', async () => {
    const result = await service.sync(chv, { reports: [validReport(), validReport()] });
    expect(result.status).toBe(SyncStatus.SUCCESS);
    expect(result.summary).toMatchObject({ created: 2, duplicates: 0, rejected: 0 });
    expect(repo.rows.size).toBe(2);
  });

  it('treats a retried report as duplicate without inserting twice', async () => {
    const report = validReport();
    await service.sync(chv, { reports: [report] });
    const retry = await service.sync(chv, { reports: [report] });
    expect(retry.results[0]).toMatchObject({ id: report.id, status: 'duplicate' });
    expect(repo.rows.size).toBe(1);
  });

  it('handles a concurrent insert race as duplicate', async () => {
    const report = validReport();
    repo.rows.set(report.id, { ...(report as unknown as HealthReport), chvId: chv.id });
    repo.findOne.mockResolvedValueOnce(null); // the lookup misses, the insert then collides
    const result = await service.sync(chv, { reports: [report] });
    expect(result.results[0].status).toBe('duplicate');
  });

  it('rejects a report ID that belongs to another CHV', async () => {
    const report = validReport();
    await service.sync(chv, { reports: [report] });
    const result = await service.sync(otherChv, { reports: [report] });
    expect(result.results[0].status).toBe('rejected');
    expect(result.status).toBe(SyncStatus.FAILED);
  });

  it('rejects invalid items individually and still saves valid ones', async () => {
    const result = await service.sync(chv, {
      reports: [validReport(), { ...validReport(), casesCount: 0, category: 'NOPE' }],
    });
    expect(result.status).toBe(SyncStatus.PARTIAL);
    expect(result.results[1]).toMatchObject({ status: 'rejected' });
    expect(result.results[1].reason).toMatch(/casesCount|category/);
  });

  it('still succeeds when the audit log write fails', async () => {
    const failing = build({
      insert: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code: 'ECONNRESET' })),
    });
    const result = await failing.sync(chv, { reports: [validReport()] });
    expect(result.summary.created).toBe(1);
  });

  it('surfaces a 503 when the database is unavailable', async () => {
    const down = { assertReady: vi.fn(() => { throw Object.assign(new Error('down'), { code: 'ECONNREFUSED' }); }) };
    const reports = new ReportsService(repo as unknown as Repository<HealthReport>, down as unknown as DatabaseService);
    const svc = new SyncService(reports, down as unknown as DatabaseService, { insert: vi.fn() } as never);
    await expect(svc.sync(chv, { reports: [validReport()] })).rejects.toMatchObject({ status: 503 });
  });
});
