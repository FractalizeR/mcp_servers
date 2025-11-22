/**
 * Операция удаления компонента
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление существующего компонента
 * - Инвалидация кеша компонента и списка компонентов очереди
 * - НЕТ создания/обновления/получения компонентов
 *
 * API: DELETE /v2/components/{componentId}
 *
 * ВАЖНО:
 * - API возвращает 204 No Content при успешном удалении
 * - После удаления инвалидируются кеши компонента и списка компонентов
 * - Требуются права на управление очередью
 * - Задачи, использующие компонент, не удаляются (компонент просто убирается из них)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { ComponentOutput } from '#tracker_api/dto/index.js';

export class DeleteComponentOperation extends BaseOperation {
  /**
   * Удаляет компонент из очереди
   *
   * @param componentId - ID компонента для удаления
   *
   * ВАЖНО:
   * - Перед удалением получаем компонент для инвалидации кеша очереди
   * - Кеш инвалидируется для компонента и списка компонентов очереди
   * - Retry автоматически обрабатывается в HttpClient
   * - Не выбрасывает ошибку если компонент уже удалён
   * - Задачи с этим компонентом не удаляются
   *
   * @example
   * ```typescript
   * // Удалить компонент с ID '1'
   * await operation.execute('1');
   * ```
   */
  async execute(componentId: string): Promise<void> {
    this.logger.info(`Удаление компонента ${componentId}`);

    // Получаем компонент перед удалением для инвалидации кеша очереди
    let queueId: string | undefined;
    try {
      const component = await this.httpClient.get<ComponentOutput>(`/v2/components/${componentId}`);
      queueId = component.queue.id;
    } catch {
      // Если компонент не найден, логируем но продолжаем удаление
      this.logger.debug(`Не удалось получить компонент ${componentId} перед удалением`);
    }

    // Выполняем DELETE запрос к API
    // API возвращает 204 No Content при успешном удалении
    await this.deleteRequest<void>(`/v2/components/${componentId}`);

    // Инвалидируем кеш компонента
    await this.invalidateComponentCache(componentId);

    // Инвалидируем кеш списка компонентов очереди, если известен ID очереди
    if (queueId) {
      await this.invalidateComponentsCache(queueId);
    }

    this.logger.info(`Компонент ${componentId} успешно удалён`);
  }

  /**
   * Инвалидирует кеш конкретного компонента
   *
   * @param componentId - ID компонента
   */
  private async invalidateComponentCache(componentId: string): Promise<void> {
    const cacheKey = EntityCacheKey.createKey(EntityType.COMPONENT, componentId);
    await this.cacheManager.delete(cacheKey);
    this.logger.debug(`Инвалидирован кеш компонента: ${componentId}`);
  }

  /**
   * Инвалидирует кеш списка компонентов для очереди
   *
   * @param queueId - ID очереди
   */
  private async invalidateComponentsCache(queueId: string): Promise<void> {
    const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, `${queueId}/components`);
    await this.cacheManager.delete(cacheKey);
    this.logger.debug(`Инвалидирован кеш компонентов для очереди: ${queueId}`);
  }
}
