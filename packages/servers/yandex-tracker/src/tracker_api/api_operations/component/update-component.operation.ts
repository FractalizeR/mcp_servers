/**
 * Операция обновления компонента
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующего компонента
 * - Инвалидация кеша компонента и списка компонентов очереди
 * - НЕТ создания/удаления/получения компонентов
 *
 * API: PATCH /v2/components/{componentId}
 *
 * ВАЖНО:
 * - Все поля опциональны (частичное обновление)
 * - Нельзя изменить привязку к очереди (она задается при создании)
 * - Требуются права на управление очередью
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { UpdateComponentDto, ComponentOutput } from '@tracker_api/dto/index.js';

export class UpdateComponentOperation extends BaseOperation {
  /**
   * Обновляет существующий компонент
   *
   * @param componentId - ID компонента для обновления
   * @param componentData - данные для обновления (все поля опциональны)
   * @returns обновлённый компонент с полными данными
   * @throws {Error} если компонент не найден
   *
   * ВАЖНО:
   * - После обновления инвалидируется кеш компонента
   * - Также инвалидируется кеш списка компонентов родительской очереди
   * - Retry делается ТОЛЬКО в HttpClient.patch (нет двойного retry)
   * - Привязку к очереди нельзя изменить
   *
   * @example
   * ```typescript
   * // Обновить название и описание компонента
   * const component = await operation.execute('1', {
   *   name: 'Backend Services',
   *   description: 'Updated description'
   * });
   * ```
   */
  async execute(componentId: string, componentData: UpdateComponentDto): Promise<ComponentOutput> {
    this.logger.info(`Обновление компонента ${componentId}`);

    // Обновляем компонент через API
    const updatedComponent = await this.httpClient.patch<ComponentOutput>(
      `/v2/components/${componentId}`,
      componentData
    );

    // Инвалидируем кеш компонента
    this.invalidateComponentCache(componentId);

    // Инвалидируем кеш списка компонентов родительской очереди
    this.invalidateComponentsCache(updatedComponent.queue.id);

    this.logger.info(`Компонент ${componentId} успешно обновлён`);

    return updatedComponent;
  }

  /**
   * Инвалидирует кеш конкретного компонента
   *
   * @param componentId - ID компонента
   */
  private invalidateComponentCache(componentId: string): void {
    const cacheKey = EntityCacheKey.createKey(EntityType.COMPONENT, componentId);
    this.cacheManager.delete(cacheKey);
    this.logger.debug(`Инвалидирован кеш компонента: ${componentId}`);
  }

  /**
   * Инвалидирует кеш списка компонентов для очереди
   *
   * @param queueId - ID очереди
   */
  private invalidateComponentsCache(queueId: string): void {
    const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, `${queueId}/components`);
    this.cacheManager.delete(cacheKey);
    this.logger.debug(`Инвалидирован кеш компонентов для очереди: ${queueId}`);
  }
}
