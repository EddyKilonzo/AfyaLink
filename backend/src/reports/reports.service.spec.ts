import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import type { DatabaseService } from '../database/database.service.js';
import { ReportStatus, type HealthReport } from '../database/entities/health-report.entity.js';
import type { Location } from '../database/entities/location.entity.js';
import { UserRole, type User } from '../database/entities/user.entity.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import { ReportsService } from './reports.service.js';

const CHV: SessionUser = { id: 'chv-1', role: UserRole.CHV, email: 'chv@afyalink.test' };
const ADMIN: SessionUser = { id: 'admin-1', role: UserRole.ADMIN, email: 'admin@afyalink.test' };
const LOCATIONS: Record<number, Partial<Location>> = { 1: { id: 1, county: 'Kitui' }, 3: { id: 3, county: 'Turkana' } };

function report(overrides: Partial<HealthReport> = {}): HealthReport {
  return { id: 'r1', chvId: CHV.id, status: ReportStatus.SUBMITTED, ...overrides } as HealthReport;
}

function dto(locationId?: number): CreateReportDto {
  const now = new Date().toISOString();
  return {
    id: 'r-new',
    category: 'OTHER',
    conditionName: 'Test',
    severity: 'LOW',
    casesCount: 1,
    ageGroup: 'MIXED',
    locationId,
    observedAt: now,
    clientCreatedAt: now,
  } as CreateReportDto;
}

describe('ReportsService policies', () => {
  const db = { assertReady: vi.fn() } as unknown as DatabaseService;
  let stored: HealthReport | null;
  let assignedCounty: string | null;
  let reports: Record<string, ReturnType<typeof vi.fn>>;
  let service: ReportsService;

  beforeEach(() => {
    stored = null;
    assignedCounty = 'Kitui';
    reports = {
      findOne: vi.fn(async () => stored),
      findOneOrFail: vi.fn(async () => stored ?? report({ id: 'r-new' })),
      create: vi.fn((d: HealthReport) => d),
      insert: vi.fn(async () => undefined),
      update: vi.fn(async () => ({ affected: 0 })),
    };
    const users = {
      findOne: vi.fn(async () => ({ location: assignedCounty ? { county: assignedCounty } : null })),
    } as unknown as Repository<User>;
    const locations = {
      findOne: vi.fn(async ({ where: { id } }: { where: { id: number } }) => LOCATIONS[id] ?? null),
    } as unknown as Repository<Location>;
    service = new ReportsService(reports as unknown as Repository<HealthReport>, db, users, locations);
  });

  describe('county policy on create', () => {
    it('allows a location in the CHV county', async () => {
      await expect(service.createIdempotent(CHV, dto(1))).resolves.toMatchObject({ outcome: 'created' });
    });

    it('rejects a location in another county', async () => {
      await expect(service.createIdempotent(CHV, dto(3))).rejects.toThrow(/outside your assigned county/);
      expect(reports.insert).not.toHaveBeenCalled();
    });

    it('rejects an unknown location', async () => {
      await expect(service.createIdempotent(CHV, dto(99))).rejects.toThrow(/Unknown location/);
    });

    it('does not restrict admins or CHVs without an assigned location', async () => {
      await expect(service.createIdempotent(ADMIN, dto(3))).resolves.toMatchObject({ outcome: 'created' });
      assignedCounty = null;
      await expect(service.createIdempotent(CHV, dto(3))).resolves.toMatchObject({ outcome: 'created' });
    });

    it('still answers a retry as duplicate even if the policy would now reject it', async () => {
      stored = report({ id: 'r-new', locationId: 3 });
      await expect(service.createIdempotent(CHV, dto(3))).resolves.toMatchObject({ outcome: 'duplicate' });
    });
  });

  describe('CHV correction', () => {
    it('rejects an empty change set', async () => {
      await expect(service.updateOwn(CHV, 'r1', {})).rejects.toThrow(BadRequestException);
    });

    it('returns 404 for a missing report or one owned by someone else', async () => {
      await expect(service.updateOwn(CHV, 'r1', { casesCount: 2 })).rejects.toThrow(NotFoundException);
      stored = report({ chvId: 'someone-else' });
      await expect(service.updateOwn(CHV, 'r1', { casesCount: 2 })).rejects.toThrow(NotFoundException);
    });

    it('returns 409 once the report has been reviewed', async () => {
      stored = report({ status: ReportStatus.REVIEWED });
      await expect(service.updateOwn(CHV, 'r1', { casesCount: 2 })).rejects.toThrow(/REVIEWED/);
    });

    it('returns 409 after the edit window', async () => {
      stored = report();
      await expect(service.updateOwn(CHV, 'r1', { casesCount: 2 })).rejects.toThrow(ConflictException);
      await expect(service.updateOwn(CHV, 'r1', { casesCount: 2 })).rejects.toThrow(/72 hours/);
    });

    it('updates only the owner’s SUBMITTED report and reports the changed fields', async () => {
      reports.update.mockResolvedValueOnce({ affected: 1 });
      stored = report();
      const result = await service.updateOwn(CHV, 'r1', { casesCount: 2, notes: null });
      expect(result.fields).toEqual(['casesCount', 'notes']);
      const [where, changes] = reports.update.mock.calls[0];
      expect(where).toMatchObject({ id: 'r1', chvId: CHV.id, status: ReportStatus.SUBMITTED });
      expect(changes).toEqual({ casesCount: 2, notes: null });
    });
  });
});
