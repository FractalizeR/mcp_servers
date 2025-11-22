/**
 * Операция создания очереди в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание одной очереди
 * - Кеширование созданной очереди по её ключу
 * - НЕТ обновления/удаления/получения
 *
 * API: POST /v3/queues/
 *
 * ВАЖНО: Создание очередей - администраторская операция!
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { CreateQueueDto, QueueOutput } from '#tracker_api/dto/index.js';

export class CreateQueueOperation extends BaseOperation {
  /**
   * Создаёт новую очередь в Яндекс.Трекере
   *
   * @param queueData - данные для создания очереди
   * @returns созданная очередь с полными данными
   * @throws {Error} если не указаны обязательные поля или ключ невалиден
   *
   * ВАЖНО:
   * - После создания очередь автоматически кешируется по её ключу
   * - Retry делается ТОЛЬКО в HttpClient.post (нет двойного retry)
   * - Ключ очереди должен соответствовать ^[A-Z]{2,10}$
   */
  async execute(queueData: CreateQueueDto): Promise<QueueOutput> {
    // Валидация ключа очереди
    const keyPattern = /^[A-Z]{2,10}$/;
    if (!keyPattern.test(queueData.key)) {
      throw new Error(`Невалидный ключ очереди: ${queueData.key}. Должен быть A-Z, 2-10 символов`);
    }

    this.logger.info(`Создание очереди с ключом ${queueData.key}: "${queueData.name}"`);

    // Создаём очередь через API
    const createdQueue = await this.httpClient.post<QueueOutput>('/v3/queues/', queueData);

    // Кешируем созданную очередь по её ключу
    const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, createdQueue.key);
    await this.cacheManager.set(cacheKey, createdQueue);

    this.logger.info(`Очередь успешно создана: ${createdQueue.key}`);

    return createdQueue;
  }
}
