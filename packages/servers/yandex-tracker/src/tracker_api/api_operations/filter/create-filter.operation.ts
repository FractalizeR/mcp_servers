/**
 * Операция создания сохранённого фильтра
 *
 * API: POST /v3/filters/
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { CreateFilterDto } from '#tracker_api/dto/index.js';
import type { SavedFilterWithUnknownFields } from '#tracker_api/entities/index.js';

export class CreateFilterOperation extends BaseOperation {
  async execute(dto: CreateFilterDto): Promise<SavedFilterWithUnknownFields> {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('CreateFilterOperation: название фильтра обязательно');
    }

    this.logger.info(`Создание сохранённого фильтра: ${dto.name}`);

    return this.httpClient.post<SavedFilterWithUnknownFields>('/v3/filters/', dto);
  }
}
