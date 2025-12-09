/**
 * Операция получения одной очереди в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение одной очереди по ID или ключу
 * - Кеширование очереди по её ключу
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v3/queues/{queueId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { GetQueueDto, QueueOutput } from '#tracker_api/dto/index.js';

export class GetQueueOperation extends BaseOperation {
  /**
   * Получает одну очередь по ID или ключу
   *
   * @param params - параметры запроса (queueId, expand)
   * @returns очередь с полными данными
   *
   * ВАЖНО:
   * - Кеширование по ключу очереди
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - expand позволяет получить дополнительные поля
   */
  async execute(params: GetQueueDto): Promise<QueueOutput> {
    const { queueId, expand } = params;

    this.logger.info(`Получение очереди: ${queueId}`);

    const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, queueId);

    return this.withCache(cacheKey, async () => {
      const queryParams = new URLSearchParams();
      if (expand) queryParams.append('expand', expand);

      const endpoint = `/v3/queues/${queueId}${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const queue = await this.httpClient.get<QueueOutput>(endpoint);

      this.logger.info(`Очередь получена: ${queue.key}`);

      return queue;
    });
  }
}
