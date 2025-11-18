/**
 * Операция получения списка компонентов очереди
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка компонентов конкретной очереди
 * - НЕТ создания/обновления/удаления компонентов
 *
 * API: GET /v2/queues/{queueId}/components
 *
 * ВАЖНО:
 * - Компоненты привязаны к очереди и всегда запрашиваются в контексте очереди
 * - API не поддерживает пагинацию для компонентов (возвращает все компоненты очереди)
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { ComponentsListOutput } from '@tracker_api/dto/index.js';

export class GetComponentsOperation extends BaseOperation {
  /**
   * Получает список всех компонентов очереди
   *
   * @param queueId - ключ или ID очереди (например, 'QUEUE' или '1')
   * @returns массив компонентов очереди
   *
   * ВАЖНО:
   * - Результат кешируется по ключу очереди
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - API возвращает все компоненты сразу (без пагинации)
   *
   * @example
   * ```typescript
   * // Получить компоненты очереди QUEUE
   * const components = await operation.execute('QUEUE');
   * ```
   */
  async execute(queueId: string): Promise<ComponentsListOutput> {
    this.logger.info(`Получение компонентов очереди ${queueId}`);

    // Проверяем кеш
    const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, `${queueId}/components`);
    const cached = this.cacheManager.get<ComponentsListOutput>(cacheKey);

    if (cached) {
      this.logger.debug(`Компоненты очереди ${queueId} получены из кеша`);
      return cached;
    }

    // Получаем компоненты через API
    const components = await this.httpClient.get<ComponentsListOutput>(
      `/v2/queues/${queueId}/components`
    );

    // Кешируем результат
    this.cacheManager.set(cacheKey, components);

    this.logger.info(`Получено ${components.length} компонентов для очереди ${queueId}`);

    return components;
  }
}
