/**
 * Генератор ключей кеша для сущностей
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание ключей вида <EntityType>:<ID>
 * - ТОЛЬКО извлечение entity key из API пути
 * - НЕТ логики кеширования (делегируется CacheManager)
 *
 * Примеры:
 * - createKey(EntityType.ISSUE, 'QUEUE-123') → 'issue:QUEUE-123'
 * - fromPath('/v3/issues/QUEUE-123') → 'issue:QUEUE-123'
 * - fromPath('/v3/issues?queue=PROJ') → null (списки не кешируются по entity key)
 */

/**
 * Типы сущностей Яндекс.Трекера
 */
export enum EntityType {
  ISSUE = 'issue',
  QUEUE = 'queue',
  USER = 'user',
  COMMENT = 'comment',
  COMPONENT = 'component',
  SPRINT = 'sprint',
  BOARD = 'board',
  PROJECT = 'project',
  ATTACHMENT = 'attachment',
  FIELD = 'field',
}

export class EntityCacheKey {
  /**
   * Создать ключ для конкретной сущности
   * @param type - тип сущности
   * @param id - идентификатор сущности
   * @returns ключ кеша вида '<type>:<id>'
   *
   * @example
   * EntityCacheKey.createKey(EntityType.ISSUE, 'QUEUE-123')
   * // → 'issue:QUEUE-123'
   */
  static createKey(type: EntityType, id: string): string {
    return `${type}:${id}`;
  }
}
