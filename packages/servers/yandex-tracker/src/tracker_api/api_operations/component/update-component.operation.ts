/**
 * Операция обновления компонента
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующего компонента
 * - Инвалидация кеша компонента и списка компонентов очереди
 * - НЕТ создания/удаления/получения компонентов
 *
 * API: PATCH /v3/components/{componentId}?version={version}
 *
 * ВАЖНО:
 * - Все поля опциональны (частичное обновление)
 * - Нельзя изменить привязку к очереди (она задается при создании)
 * - Требуются права на управление очередью
 * - Версия обязательна: без неё API отвечает 428 и правка не проходит вовсе
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { UpdateComponentDto, ComponentOutput } from '#tracker_api/dto/index.js';

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
  async execute(
    componentId: string,
    componentData: UpdateComponentDto,
    version?: number
  ): Promise<ComponentOutput> {
    this.logger.info(`Обновление компонента ${componentId}`);

    const effectiveVersion = version ?? (await this.readCurrentVersion(componentId));

    const updatedComponent = await this.httpClient.patch<ComponentOutput>(
      `/v3/components/${componentId}?version=${effectiveVersion}`,
      componentData
    );

    // Инвалидируем кеш компонента
    await this.invalidateComponentCache(componentId);

    // Инвалидируем кеш списка компонентов родительской очереди
    await this.invalidateComponentsCache(updatedComponent.queue.id);

    this.logger.info(`Компонент ${componentId} успешно обновлён`);

    return updatedComponent;
  }

  /**
   * Читает текущую версию компонента.
   *
   * Лишний GET осознан: без версии API отвечает 428, а вызывающий её обычно не
   * держит. Передавшему версию явно этот запрос не делается — там работает
   * настоящая оптимистичная блокировка.
   */
  private async readCurrentVersion(componentId: string): Promise<number> {
    const component = await this.httpClient.get<ComponentOutput>(`/v3/components/${componentId}`);
    const version = component.version;
    // Без этой проверки в URL уехало бы `?version=undefined`, и API отверг бы запрос
    // сообщением про формат, а не про причину — читать его пришлось бы наугад.
    if (typeof version !== 'number') {
      throw new Error(
        `Не удалось прочитать версию компонента ${componentId}: ответ API её не содержит. ` +
          'Передай version параметром инструмента.'
      );
    }
    return version;
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
