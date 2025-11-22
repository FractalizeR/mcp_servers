/**
 * Cache модуль - экспорт всех компонентов
 *
 * Включает:
 * - Интерфейс CacheManager
 * - EntityCacheKey - генератор ключей для entity-based кеширования
 * - EntityType - enum типов сущностей
 * - NoOpCache - заглушка (Null Object Pattern)
 * - InMemoryCacheManager - in-memory реализация кеша с async интерфейсом
 */

export type { CacheManager } from './cache-manager.interface.js';
export { NoOpCache } from './no-op-cache.js';
export { InMemoryCacheManager } from './in-memory-cache-manager.js';
export { EntityCacheKey, EntityType } from './entity-cache-key.js';
