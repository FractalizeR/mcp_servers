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
import { buildEntityQuery } from './entity-query.util.js';

export class CreateEntityOperation extends BaseOperation {
  async execute(dto: CreateEntityDto): Promise<EntityApiOutput> {
    const { entityType, extraFields, entityFields } = dto;

    if (extraFields === undefined || Object.keys(extraFields).length === 0) {
      throw new Error(
        'CreateEntityOperation: extraFields обязателен (Entity API требует минимум поле summary)'
      );
    }

    this.logger.info(`Создание записи Entity API: ${entityType}`);

    // Подтверждено живой пробой: тело — `{ fields: {...} }`, а не name/description.
    const data = await this.httpClient.post<unknown>(
      `/v3/entities/${entityType}${buildEntityQuery({ entityFields })}`,
      { fields: extraFields }
    );
    return assertEntityRecordShape<EntityApiOutput>(data, `create_entity ${entityType}`);
  }
}
