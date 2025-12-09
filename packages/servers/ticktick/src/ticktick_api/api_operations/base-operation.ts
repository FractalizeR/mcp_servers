/**
 * Base class for all TickTick API operations
 *
 * Responsibilities (SRP):
 * - Provide common dependencies (http, cache, logger)
 * - Helper methods for caching
 * - NO business logic (delegated to subclasses)
 *
 * Pattern: Template Method
 * Defines common structure, concrete operations implement details.
 */

import type { IHttpClient, CacheManager, Logger } from '@fractalizer/mcp-infrastructure';

export abstract class BaseOperation {
  constructor(
    protected readonly httpClient: IHttpClient,
    protected readonly cacheManager: CacheManager,
    protected readonly logger: Logger
  ) {}

  /**
   * Execute operation with caching
   *
   * @param cacheKey - cache key
   * @param fn - function to execute (if cache is empty)
   * @returns execution result
   */
  protected async withCache<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    // Try to get from cache
    const cached = await this.cacheManager.get<T>(cacheKey);

    if (cached !== null) {
      this.logger.debug(`Operation cache hit: ${cacheKey}`);
      return cached;
    }

    // Cache miss, execute function
    this.logger.debug(`Operation cache miss: ${cacheKey}`);
    const result = await fn();

    // Save to cache
    await this.cacheManager.set(cacheKey, result);

    return result;
  }

  /**
   * Execute DELETE request
   *
   * Wrapper over httpClient.delete with logging.
   * Used for deleting resources (projects, tasks, etc).
   *
   * @param endpoint - resource path (relative to baseURL)
   * @returns DELETE request result
   */
  protected async deleteRequest<TResponse = void>(endpoint: string): Promise<TResponse> {
    this.logger.debug(`BaseOperation: DELETE ${endpoint}`);
    return this.httpClient.delete<TResponse>(endpoint);
  }
}
