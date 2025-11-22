/**
 * Заглушка для отключения кеширования
 *
 * Ответственность (SRP):
 * - ТОЛЬКО предоставление пустой реализации CacheManager
 * - Используется когда кеширование отключено
 *
 * Паттерн: Null Object Pattern
 * Позволяет избежать проверок на null в коде, использующем кеш
 *
 * @example
 * // Вместо:
 * if (cache) {
 *   const value = cache.get(key);
 * }
 *
 * // Используем:
 * const cache = config.enableCache ? new MemoryCache() : new NoOpCache();
 * const value = cache.get(key); // Всегда undefined для NoOpCache
 */

import type { CacheManager } from './cache-manager.interface.js';

export class NoOpCache implements CacheManager {
  /**
   * Всегда возвращает null (cache miss)
   */
  get<T>(_key: string): Promise<T | null> {
    return Promise.resolve(null);
  }

  /**
   * Ничего не делает (не сохраняет)
   */
  set<T>(_key: string, _value: T, _ttl?: number): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Ничего не делает (нечего удалять)
   */
  delete(_key: string): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Ничего не делает (нечего очищать)
   */
  clear(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Ничего не делает (нечего удалять)
   */
  prune(): Promise<void> {
    return Promise.resolve();
  }
}
