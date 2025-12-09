/**
 * Базовый класс для всех операций Wiki API
 *
 * Ответственность (SRP):
 * - Предоставление общих зависимостей (http, cache, logger)
 * - Вспомогательные методы для кеширования
 * - НЕТ бизнес-логики (делегируется наследникам)
 */

import type { IHttpClient, CacheManager, Logger } from '@fractalizer/mcp-infrastructure';

export abstract class BaseOperation {
  constructor(
    protected readonly httpClient: IHttpClient,
    protected readonly cacheManager: CacheManager,
    protected readonly logger: Logger
  ) {}

  /**
   * Выполнение с кешированием
   */
  protected async withCache<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    const cached = await this.cacheManager.get<T>(cacheKey);

    if (cached !== null) {
      this.logger.debug(`Operation cache hit: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Operation cache miss: ${cacheKey}`);
    const result = await fn();

    await this.cacheManager.set(cacheKey, result);

    return result;
  }

  /**
   * Выполнить DELETE запрос
   */
  protected async deleteRequest<TResponse = void>(endpoint: string): Promise<TResponse> {
    this.logger.debug(`BaseOperation: DELETE ${endpoint}`);
    return this.httpClient.delete<TResponse>(endpoint);
  }
}
