/**
 * Операция создания компонента
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание одного компонента
 * - Кеширование созданного компонента
 * - Инвалидация кеша списка компонентов очереди
 * - НЕТ обновления/удаления/получения компонентов
 *
 * API: POST /v3/components (очередь — ключ `queue` в теле запроса, не в пути;
 * `POST /v3/queues/{queueId}/components` в API не существует)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { CreateComponentDto, ComponentOutput } from '#tracker_api/dto/index.js';

export class CreateComponentOperation extends BaseOperation {
  /**
   * Создаёт новый компонент
   *
   * @param componentData - данные для создания компонента (включая ключ очереди `queue`)
   * @returns созданный компонент с полными данными
   * @throws {Error} если не указано название компонента или очередь не существует
   *
   * ВАЖНО:
   * - После создания компонент автоматически кешируется по его ID
   * - Инвалидируется кеш списка компонентов очереди
   * - Retry делается ТОЛЬКО в HttpClient.post (нет двойного retry)
   * - Компонент навсегда привязывается к указанной очереди
   *
   * @example
   * ```typescript
   * // Создать компонент в очереди QUEUE
   * const component = await operation.execute({
   *   name: 'Backend',
   *   queue: 'QUEUE',
   *   description: 'Backend services',
   *   assignAuto: true,
   *   lead: 'user-login'
   * });
   * ```
   */
  async execute(componentData: CreateComponentDto): Promise<ComponentOutput> {
    // Валидация обязательного поля
    if (!componentData.name || componentData.name.trim() === '') {
      throw new Error('Название компонента обязательно');
    }

    this.logger.info(
      `Создание компонента "${componentData.name}" в очереди ${componentData.queue}`
    );

    // Создаём компонент через API
    const createdComponent = await this.httpClient.post<ComponentOutput>(
      '/v3/components',
      componentData
    );

    // Кешируем созданный компонент по его ID
    const componentCacheKey = EntityCacheKey.createKey(
      EntityType.COMPONENT,
      String(createdComponent.id)
    );
    await this.cacheManager.set(componentCacheKey, createdComponent);

    // Инвалидируем кеш списка компонентов очереди
    await this.invalidateComponentsCache(componentData.queue);

    this.logger.info(
      `Компонент успешно создан: ${createdComponent.name} (ID: ${createdComponent.id})`
    );

    return createdComponent;
  }

  /**
   * Инвалидирует кеш списка компонентов для очереди
   *
   * @param queueId - ключ или ID очереди
   */
  private async invalidateComponentsCache(queueId: string): Promise<void> {
    const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, `${queueId}/components`);
    await this.cacheManager.delete(cacheKey);
    this.logger.debug(`Инвалидирован кеш компонентов для очереди: ${queueId}`);
  }
}
