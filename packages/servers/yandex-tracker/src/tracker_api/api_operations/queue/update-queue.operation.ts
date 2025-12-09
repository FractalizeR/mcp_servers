/**
 * Операция обновления очереди в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление одной очереди
 * - Инвалидация кеша после обновления
 * - НЕТ создания/удаления/получения
 *
 * API: PATCH /v3/queues/{queueId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { UpdateQueueDto, QueueOutput } from '#tracker_api/dto/index.js';

export interface UpdateQueueParams {
  queueId: string;
  updates: UpdateQueueDto;
}

export class UpdateQueueOperation extends BaseOperation {
  /**
   * Обновляет существующую очередь
   *
   * @param params - параметры (queueId и updates)
   * @returns обновлённая очередь с полными данными
   *
   * ВАЖНО:
   * - После обновления кеш инвалидируется
   * - Retry делается ТОЛЬКО в HttpClient.patch (нет двойного retry)
   * - Все поля в updates опциональны
   */
  async execute(params: UpdateQueueParams): Promise<QueueOutput> {
    const { queueId, updates } = params;

    this.logger.info(`Обновление очереди: ${queueId}`);

    // Обновляем очередь через API
    const updatedQueue = await this.httpClient.patch<QueueOutput>(`/v3/queues/${queueId}`, updates);

    // Инвалидируем кеш для обновлённой очереди
    const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, updatedQueue.key);
    await this.cacheManager.delete(cacheKey);

    this.logger.info(`Очередь успешно обновлена: ${updatedQueue.key}`);

    return updatedQueue;
  }
}
