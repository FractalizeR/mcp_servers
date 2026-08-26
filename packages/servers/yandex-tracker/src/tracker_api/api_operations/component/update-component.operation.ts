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
import { readCurrentVersion } from '#tracker_api/api_operations/read-current-version.util.js';
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

    // `version` уходит query-параметром, не телом: явная деструктуризация — гарантия
    // на уровне операции, а не только у вызывающего инструмента (`UpdateComponentDto`
    // несёт индексную сигнатуру `[key: string]: unknown`, и без деструктуризации
    // вызов операции напрямую с версией в данных отправил бы её телом).
    const { version: _ignoredBodyVersion, ...body } = componentData;

    const effectiveVersion =
      version ??
      (await readCurrentVersion(
        this.httpClient,
        `/v3/components/${componentId}`,
        componentId,
        'компонента'
      ));

    const updatedComponent = await this.httpClient.patch<ComponentOutput>(
      `/v3/components/${componentId}?version=${effectiveVersion}`,
      body
    );

    // Инвалидируем кеш компонента
    await this.invalidateComponentCache(componentId);

    // Инвалидируем кеш списка компонентов родительской очереди
    await this.invalidateComponentsCache(updatedComponent.queue.id);

    this.logger.info(`Компонент ${componentId} успешно обновлён`);

    return updatedComponent;
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
