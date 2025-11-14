/**
 * Базовый класс для всех операций API
 *
 * Ответственность (SRP):
 * - Предоставление общих зависимостей (http, retry, cache, logger)
 * - Вспомогательные методы для кеширования и retry
 * - НЕТ бизнес-логики (делегируется наследникам)
 *
 * Паттерн: Template Method
 * Определяет общую структуру, конкретные операции реализуют детали
 */

import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { RetryHandler } from '@infrastructure/http/retry/retry-handler.js';
import type { CacheManager } from '@infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@infrastructure/logging/index.js';

export abstract class BaseOperation {
  constructor(
    protected readonly httpClient: HttpClient,
    protected readonly retryHandler: RetryHandler,
    protected readonly cacheManager: CacheManager,
    protected readonly logger: Logger
  ) {}

  /**
   * Выполнение с кешированием
   *
   * @param cacheKey - ключ кеша
   * @param fn - функция для выполнения (если кеш пуст)
   * @returns результат выполнения
   */
  protected async withCache<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    // Пытаемся получить из кеша
    const cached = this.cacheManager.get<T>(cacheKey);

    if (cached !== undefined) {
      this.logger.debug(`Operation cache hit: ${cacheKey}`);
      return cached;
    }

    // Кеш пуст, выполняем функцию
    this.logger.debug(`Operation cache miss: ${cacheKey}`);
    const result = await fn();

    // Сохраняем в кеш
    this.cacheManager.set(cacheKey, result);

    return result;
  }

  /**
   * DEPRECATED: Метод удалён для исправления проблемы "двойного retry".
   *
   * Retry логика уже встроена в HttpClient.get/post/patch/delete методы.
   * Использование withRetry() приводило к мультипликативному росту попыток (3×3=9).
   *
   * Если нужен retry для НЕ-HTTP операций, создайте отдельный метод с явным названием,
   * например: withExternalApiRetry() или withDatabaseRetry().
   */
}
