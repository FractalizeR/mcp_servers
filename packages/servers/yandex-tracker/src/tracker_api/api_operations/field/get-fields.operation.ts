/**
 * Операция получения списка всех полей трекера
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка всех полей Яндекс.Трекера
 * - НЕТ создания/обновления/удаления полей
 * - НЕТ получения конкретного поля
 *
 * API: GET /v2/fields
 *
 * ВАЖНО:
 * - Возвращает все поля трекера (системные + кастомные)
 * - API не поддерживает пагинацию (возвращает все поля сразу)
 * - Результат кешируется для оптимизации производительности
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { FieldsListOutput } from '@tracker_api/dto/index.js';

export class GetFieldsOperation extends BaseOperation {
  /**
   * Получает список всех полей Яндекс.Трекера
   *
   * @returns массив всех полей (системных и кастомных)
   *
   * ВАЖНО:
   * - Результат кешируется глобально
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - API возвращает все поля сразу (без пагинации)
   * - Включает как системные поля (summary, assignee), так и кастомные
   *
   * @example
   * ```typescript
   * // Получить все поля трекера
   * const fields = await operation.execute();
   * ```
   */
  async execute(): Promise<FieldsListOutput> {
    this.logger.info('Получение списка всех полей трекера');

    // Проверяем кеш
    const cacheKey = EntityCacheKey.createKey(EntityType.FIELD, 'all');
    const cached = this.cacheManager.get<FieldsListOutput>(cacheKey);

    if (cached) {
      this.logger.debug('Список полей получен из кеша');
      return cached;
    }

    // Получаем поля через API
    const fields = await this.httpClient.get<FieldsListOutput>('/v2/fields');

    // Кешируем результат
    this.cacheManager.set(cacheKey, fields);

    this.logger.info(`Получено ${fields.length} полей`);

    return fields;
  }
}
