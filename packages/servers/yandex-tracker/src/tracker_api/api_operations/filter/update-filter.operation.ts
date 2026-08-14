/**
 * Операция обновления сохранённого фильтра
 *
 * API: PATCH /v3/filters/{id}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { UpdateFilterDto } from '#tracker_api/dto/index.js';
import type { SavedFilterWithUnknownFields } from '#tracker_api/entities/index.js';

export class UpdateFilterOperation extends BaseOperation {
  async execute(dto: UpdateFilterDto): Promise<SavedFilterWithUnknownFields> {
    const { filterId, ...updateData } = dto;
    this.logger.info(`Обновление сохранённого фильтра: ${filterId}`);

    return this.httpClient.patch<SavedFilterWithUnknownFields>(
      `/v3/filters/${filterId}`,
      updateData
    );
  }
}
