/**
 * Операция создания записи Entity API (Goal/Project/Portfolio)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание одной записи заданного entityType
 * - НЕТ поиска/получения/обновления/удаления
 *
 * API: POST /v3/entities/{entityType}
 *
 * ФОРМА ОТВЕТА: см. `get-entity.operation.ts` — та же оговорка и тот же guard.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { CreateEntityDto, EntityApiOutput } from '#tracker_api/dto/entity-api/index.js';
import { assertEntityRecordShape } from './assert-entity-record-shape.util.js';

export class CreateEntityOperation extends BaseOperation {
  async execute(dto: CreateEntityDto): Promise<EntityApiOutput> {
    const { entityType, name, description, extraFields } = dto;

    if (!name || name.trim() === '') {
      throw new Error('CreateEntityOperation: название записи обязательно');
    }

    this.logger.info(`Создание записи Entity API: ${entityType}`, { name });

    const body: Record<string, unknown> = {
      name,
      ...(description !== undefined ? { description } : {}),
      ...(extraFields ?? {}),
    };

    const data = await this.httpClient.post<unknown>(`/v3/entities/${entityType}`, body);
    return assertEntityRecordShape<EntityApiOutput>(data, `create_entity ${entityType}`);
  }
}
