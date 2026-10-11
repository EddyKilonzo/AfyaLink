import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { errorCode, toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { Location } from '../database/entities/location.entity.js';
import type { CreateLocationDto } from './dto/create-location.dto.js';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Location) private readonly locations: Repository<Location>,
    private readonly db: DatabaseService,
  ) {}

  /** Administrative units are a small reference list, so it is returned whole. */
  async list(county?: string): Promise<Location[]> {
    try {
      this.db.assertReady();
      return await this.locations.find({
        where: county ? { county } : {},
        order: { county: 'ASC', subCounty: 'ASC', ward: 'ASC', village: 'ASC' },
        take: 1000,
      });
    } catch (error) {
      throw toHttpException(error, this.logger, 'List locations');
    }
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    try {
      this.db.assertReady();
      try {
        const result = await this.locations.insert({
          county: dto.county,
          subCounty: dto.subCounty,
          ward: dto.ward,
          village: dto.village ?? null,
          latitude: dto.latitude !== undefined ? dto.latitude.toFixed(6) : null,
          longitude: dto.longitude !== undefined ? dto.longitude.toFixed(6) : null,
        });
        const id = Number(result.identifiers[0]?.id);
        return await this.locations.findOneOrFail({ where: { id } });
      } catch (error) {
        if (errorCode(error) === 'ER_DUP_ENTRY') throw new ConflictException('This location already exists.');
        throw error;
      }
    } catch (error) {
      throw toHttpException(error, this.logger, 'Create location');
    }
  }
}
