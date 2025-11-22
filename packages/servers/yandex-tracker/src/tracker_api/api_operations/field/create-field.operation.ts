/**
 * Операция создания кастомного поля
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание нового кастомного поля
 * - НЕТ обновления/удаления/получения полей
 * - НЕТ валидации прав доступа (делается в API)
 *
 * API: POST /v2/fields
 *
 * ВАЖНО:
 * - Создаются только кастомные поля (системные поля нельзя создавать)
 * - После создания тип поля (schema.type) нельзя изменить
 * - Требуются права администратора
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { CreateFieldDto, FieldOutput } from '#tracker_api/dto/index.js';

export class CreateFieldOperation extends BaseOperation {
  /**
   * Создает новое кастомное поле в трекере
   *
   * @param input - данные для создания поля
   * @returns созданное поле
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.post
   * - После создания инвалидируется кеш списка полей
   * - API возвращает полный объект созданного поля
   *
   * @example
   * ```typescript
   * // Создать текстовое поле
   * const field = await operation.execute({
   *   name: 'Custom Priority',
   *   description: 'Priority set by customer',
   *   schema: { type: 'string' }
   * });
   * ```
   */
  async execute(input: CreateFieldDto): Promise<FieldOutput> {
    this.logger.info(`Создание кастомного поля: ${input.name}`);

    // Создаем поле через API
    const field = await this.httpClient.post<FieldOutput>('/v2/fields', input);

    // Инвалидируем кеш списка полей
    await this.cacheManager.delete(EntityCacheKey.createKey(EntityType.FIELD, 'all'));

    // Кешируем созданное поле
    await this.cacheManager.set(EntityCacheKey.createKey(EntityType.FIELD, field.id), field);

    this.logger.info(`Поле ${field.id} успешно создано`);

    return field;
  }
}
