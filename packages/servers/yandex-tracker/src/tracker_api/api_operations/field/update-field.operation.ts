/**
 * Операция обновления поля
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующего поля
 * - НЕТ создания/удаления/получения полей
 * - НЕТ валидации прав доступа (делается в API)
 *
 * API: PATCH /v2/fields/{fieldId}
 *
 * ВАЖНО:
 * - Тип поля (schema.type) нельзя изменить после создания
 * - Можно обновить только кастомные поля (системные защищены)
 * - Требуются права администратора
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { UpdateFieldDto, FieldOutput } from '#tracker_api/dto/index.js';

export class UpdateFieldOperation extends BaseOperation {
  /**
   * Обновляет существующее поле
   *
   * @param fieldId - идентификатор поля
   * @param input - данные для обновления (частичное обновление)
   * @returns обновленное поле
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.patch
   * - После обновления инвалидируется кеш поля и списка полей
   * - API возвращает полный объект обновленного поля
   * - Все поля в input опциональны (частичное обновление)
   *
   * @example
   * ```typescript
   * // Обновить название поля
   * const field = await operation.execute('customField123', {
   *   name: 'Updated Field Name',
   *   description: 'Updated description'
   * });
   * ```
   */
  async execute(fieldId: string, input: UpdateFieldDto): Promise<FieldOutput> {
    this.logger.info(`Обновление поля ${fieldId}`);

    // Обновляем поле через API
    const field = await this.httpClient.patch<FieldOutput>(`/v2/fields/${fieldId}`, input);

    // Инвалидируем кеш
    await this.cacheManager.delete(EntityCacheKey.createKey(EntityType.FIELD, fieldId));
    await this.cacheManager.delete(EntityCacheKey.createKey(EntityType.FIELD, 'all'));

    // Кешируем обновленное поле
    await this.cacheManager.set(EntityCacheKey.createKey(EntityType.FIELD, field.id), field);

    this.logger.info(`Поле ${fieldId} успешно обновлено`);

    return field;
  }
}
