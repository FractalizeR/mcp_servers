/**
 * Интерфейс менеджера кеша
 *
 * Паттерн: Strategy Pattern
 * Асинхронный интерфейс для поддержки внешних кешей (Redis, Memcached)
 *
 * Ответственность (SRP):
 * - Определение операций с кешем (get, set, delete, clear, prune)
 * - НЕТ конкретной реализации (делегируется классам-имплементаторам)
 */

export interface CacheManager {
  /**
   * Получить значение из кеша
   * @param key - ключ кеша
   * @returns значение или null, если ключ не найден или истёк
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Сохранить значение в кеш
   * @param key - ключ кеша
   * @param value - значение для сохранения
   * @param ttl - опциональное время жизни в миллисекундах (если не указано, используется значение по умолчанию)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Удалить значение из кеша
   * @param key - ключ кеша
   */
  delete(key: string): Promise<void>;

  /**
   * Очистить весь кеш
   */
  clear(): Promise<void>;

  /**
   * Удалить устаревшие записи из кеша (с истёкшим TTL)
   */
  prune(): Promise<void>;
}
