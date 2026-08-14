/**
 * Операция обновления локального поля очереди
 *
 * ВАЖНО: адресация по короткому `key` — см. примечание в
 * `update-queue-local-field.dto.ts`.
 *
 * API: PATCH /v3/queues/{queueId}/localFields/{key}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { UpdateQueueLocalFieldDto } from '#tracker_api/dto/index.js';
import type { QueueLocalFieldWithUnknownFields } from '#tracker_api/entities/index.js';

export class UpdateQueueLocalFieldOperation extends BaseOperation {
  async execute(dto: UpdateQueueLocalFieldDto): Promise<QueueLocalFieldWithUnknownFields> {
    const {
      queueId,
      key,
      nameEn,
      nameRu,
      category,
      order,
      description,
      readonly,
      visible,
      hidden,
    } = dto;

    this.logger.info(`Обновление локального поля очереди ${queueId}: ${key}`);

    const name =
      nameEn !== undefined || nameRu !== undefined
        ? {
            ...(nameEn !== undefined ? { en: nameEn } : {}),
            ...(nameRu !== undefined ? { ru: nameRu } : {}),
          }
        : undefined;

    const body: Record<string, unknown> = {
      ...(name !== undefined ? { name } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(readonly !== undefined ? { readonly } : {}),
      ...(visible !== undefined ? { visible } : {}),
      ...(hidden !== undefined ? { hidden } : {}),
    };

    return this.httpClient.patch<QueueLocalFieldWithUnknownFields>(
      `/v3/queues/${queueId}/localFields/${key}`,
      body
    );
  }
}
