/**
 * Операция создания локального поля очереди
 *
 * API: POST /v3/queues/{queueId}/localFields
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { CreateQueueLocalFieldDto } from '#tracker_api/dto/index.js';
import type { QueueLocalFieldWithUnknownFields } from '#tracker_api/entities/index.js';

export class CreateQueueLocalFieldOperation extends BaseOperation {
  async execute(dto: CreateQueueLocalFieldDto): Promise<QueueLocalFieldWithUnknownFields> {
    const { queueId, id, nameEn, nameRu, category, type } = dto;

    this.logger.info(`Создание локального поля очереди ${queueId}: ${id}`);

    const body = {
      id,
      name: { en: nameEn, ru: nameRu },
      category,
      type,
    };

    return this.httpClient.post<QueueLocalFieldWithUnknownFields>(
      `/v3/queues/${queueId}/localFields`,
      body
    );
  }
}
