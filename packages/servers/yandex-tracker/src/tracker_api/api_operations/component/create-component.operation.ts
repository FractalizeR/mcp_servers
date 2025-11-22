/**
 * Операция создания компонента в очереди
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание одного компонента в указанной очереди
 * - Кеширование созданного компонента
 * - Инвалидация кеша списка компонентов очереди
 * - НЕТ обновления/удаления/получения компонентов
 *
 * API: POST /v2/queues/{queueId}/components
 *
 * ВАЖНО:
 * - Компонент создается в контексте конкретной очереди (queueId в URL)
 * - После создания нельзя изменить привязку к очереди
 * - Требуются права на управление очередью
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { CreateComponentDto, ComponentOutput } from '#tracker_api/dto/index.js';

export class CreateComponentOperation extends BaseOperation {
  /**
   * Создаёт новый компонент в очереди
   *
   * @param queueId - ключ или ID очереди (например, 'QUEUE' или '1')
   * @param componentData - данные для создания компонента
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
   * const component = await operation.execute('QUEUE', {
   *   name: 'Backend',
   *   description: 'Backend services',
   *   assignAuto: true,
   *   lead: 'user-login'
   * });
   * ```
   */
  async execute(queueId: string, componentData: CreateComponentDto): Promise<ComponentOutput> {
    // Валидация обязательного поля
    if (!componentData.name || componentData.name.trim() === '') {
      throw new Error('Название компонента обязательно');
    }

    this.logger.info(`Создание компонента "${componentData.name}" в очереди ${queueId}`);

    // Создаём компонент через API
    const createdComponent = await this.httpClient.post<ComponentOutput>(
      `/v2/queues/${queueId}/components`,
      componentData
    );

    // Кешируем созданный компонент по его ID
    const componentCacheKey = EntityCacheKey.createKey(EntityType.COMPONENT, createdComponent.id);
    await this.cacheManager.set(componentCacheKey, createdComponent);

    // Инвалидируем кеш списка компонентов очереди
    await this.invalidateComponentsCache(queueId);

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
