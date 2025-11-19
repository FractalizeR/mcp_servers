/**
 * Операция получения поля по ID
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение конкретного поля по его ID
 * - НЕТ получения списка полей
 * - НЕТ создания/обновления/удаления полей
 *
 * API: GET /v2/fields/{fieldId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { FieldOutput } from '@tracker_api/dto/index.js';

export class GetFieldOperation extends BaseOperation {
  /**
   * Получает поле по его ID
   *
   * @param fieldId - идентификатор поля (например, 'summary', 'assignee', 'customField123')
   * @returns данные поля
   *
   * ВАЖНО:
   * - Результат кешируется по ID поля
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   *
   * @example
   * ```typescript
   * // Получить поле по ID
   * const field = await operation.execute('summary');
   * ```
   */
  async execute(fieldId: string): Promise<FieldOutput> {
    this.logger.info(`Получение поля ${fieldId}`);

    // Проверяем кеш
    const cacheKey = EntityCacheKey.createKey(EntityType.FIELD, fieldId);
    const cached = this.cacheManager.get<FieldOutput>(cacheKey);

    if (cached) {
      this.logger.debug(`Поле ${fieldId} получено из кеша`);
      return cached;
    }

    // Получаем поле через API
    const field = await this.httpClient.get<FieldOutput>(`/v2/fields/${fieldId}`);

    // Кешируем результат
    this.cacheManager.set(cacheKey, field);

    this.logger.info(`Поле ${fieldId} успешно получено`);

    return field;
  }
}
