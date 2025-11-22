/**
 * Операция удаления поля
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление существующего поля
 * - НЕТ создания/обновления/получения полей
 * - НЕТ валидации прав доступа (делается в API)
 *
 * API: DELETE /v2/fields/{fieldId}
 *
 * ВАЖНО:
 * - Удаляются только кастомные поля (системные защищены)
 * - Требуются права администратора
 * - Удаление необратимо
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

export class DeleteFieldOperation extends BaseOperation {
  /**
   * Удаляет поле
   *
   * @param fieldId - идентификатор поля для удаления
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.delete
   * - После удаления инвалидируется кеш поля и списка полей
   * - API возвращает 204 No Content при успехе
   * - Можно удалить только кастомные поля
   *
   * @example
   * ```typescript
   * // Удалить кастомное поле
   * await operation.execute('customField123');
   * ```
   */
  async execute(fieldId: string): Promise<void> {
    this.logger.info(`Удаление поля ${fieldId}`);

    // Удаляем поле через API
    await this.httpClient.delete(`/v2/fields/${fieldId}`);

    // Инвалидируем кеш
    await this.cacheManager.delete(EntityCacheKey.createKey(EntityType.FIELD, fieldId));
    await this.cacheManager.delete(EntityCacheKey.createKey(EntityType.FIELD, 'all'));

    this.logger.info(`Поле ${fieldId} успешно удалено`);
  }
}
