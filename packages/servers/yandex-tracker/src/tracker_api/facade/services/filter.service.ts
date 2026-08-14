/**
 * Filter Service - сервис для работы с сохранёнными фильтрами
 *
 * Ответственность:
 * - Список фильтров, создание, обновление
 *
 * Архитектура: прямая инъекция операций через декораторы, без зависимостей
 * от других сервисов.
 */

import { injectable, inject } from 'inversify';
import {
  GetFiltersOperation,
  CreateFilterOperation,
  UpdateFilterOperation,
} from '#tracker_api/api_operations/filter/index.js';
import type { CreateFilterDto, UpdateFilterDto } from '#tracker_api/dto/index.js';
import type { SavedFilterWithUnknownFields, PaginatedResult } from '#tracker_api/entities/index.js';

@injectable()
export class FilterService {
  constructor(
    @inject(GetFiltersOperation) private readonly getFiltersOp: GetFiltersOperation,
    @inject(CreateFilterOperation) private readonly createFilterOp: CreateFilterOperation,
    @inject(UpdateFilterOperation) private readonly updateFilterOp: UpdateFilterOperation
  ) {}

  async getFilters(): Promise<PaginatedResult<SavedFilterWithUnknownFields>> {
    return this.getFiltersOp.execute();
  }

  async createFilter(dto: CreateFilterDto): Promise<SavedFilterWithUnknownFields> {
    return this.createFilterOp.execute(dto);
  }

  async updateFilter(dto: UpdateFilterDto): Promise<SavedFilterWithUnknownFields> {
    return this.updateFilterOp.execute(dto);
  }
}
