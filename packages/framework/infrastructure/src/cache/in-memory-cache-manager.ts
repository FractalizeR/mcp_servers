import type { CacheManager } from './cache-manager.interface.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory реализация кеша
 *
 * Паттерн: Strategy Pattern
 * Асинхронный интерфейс для совместимости с внешними кешами (Redis, Memcached)
 *
 * Ответственность (SRP):
 * - Хранение данных в памяти процесса
 * - Управление TTL (время жизни записей)
 * - Автоматическое удаление устаревших записей
 *
 * Примечание: Данные теряются при перезапуске процесса
 */
export class InMemoryCacheManager implements CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTtl: number;

  /**
   * @param defaultTtl - время жизни записей по умолчанию в миллисекундах (default: 300000 = 5 минут)
   */
  constructor(defaultTtl: number = 300000) {
    this.defaultTtl = defaultTtl;
  }

  /**
   * Получить значение из кеша
   * @param key - ключ кеша
   * @returns значение или null, если ключ не найден или истёк
   */
  get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return Promise.resolve(null);
    }

    // Проверяем TTL
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.value);
  }

  /**
   * Сохранить значение в кеш
   * @param key - ключ кеша
   * @param value - значение для сохранения
   * @param ttl - опциональное время жизни в миллисекундах
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl ?? this.defaultTtl);
    this.cache.set(key, { value, expiresAt });
    return Promise.resolve();
  }

  /**
   * Удалить значение из кеша
   * @param key - ключ кеша
   */
  delete(key: string): Promise<void> {
    this.cache.delete(key);
    return Promise.resolve();
  }

  /**
   * Очистить весь кеш
   */
  clear(): Promise<void> {
    this.cache.clear();
    return Promise.resolve();
  }

  /**
   * Удалить устаревшие записи из кеша (с истёкшим TTL)
   */
  prune(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    return Promise.resolve();
  }
}
