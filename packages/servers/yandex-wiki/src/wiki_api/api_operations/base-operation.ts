/**
 * Базовый класс для всех операций Wiki API
 *
 * Ответственность (SRP):
 * - Предоставление общих зависимостей (http, cache, logger)
 * - Вспомогательные методы для кеширования
 * - НЕТ бизнес-логики (делегируется наследникам)
 *
 * `putBinary`/`downloadFile` (пакет 7.2.D) — эскейп-хетч в обход типизированных
 * методов `IHttpClient`: он не умеет ни raw-бинарный PUT (`upload_part` Wiki
 * API ждёт `application/octet-stream`, не JSON), ни ответ с `responseType:
 * 'arraybuffer'`. Паттерн взят из Трекера (`tracker_api/api_operations/
 * base-operation.ts`, `uploadFile`/`downloadFile`) — та же причина там же:
 * `getAxiosInstance()` — прямой доступ к axios instance, задокументированный
 * как эскейп-хетч в `IHttpClient` (см. её JSDoc).
 */

import type { IHttpClient, CacheManager, Logger } from '@fractalizer/mcp-infrastructure';
import type { DownloadedFile } from '#wiki_api/entities/index.js';

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

  /**
   * Выполнить PUT запрос с бинарным телом (`application/octet-stream` по
   * умолчанию) — в обход `IHttpClient`, у которого нет метода PUT вовсе.
   * Используется для `upload_part` Upload Session.
   */
  protected async putBinary<TResponse>(
    endpoint: string,
    buffer: Buffer,
    contentType = 'application/octet-stream'
  ): Promise<TResponse> {
    this.logger.debug(`BaseOperation: PUT (binary, ${buffer.length} bytes) ${endpoint}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosInstance = this.httpClient.getAxiosInstance?.() as any;
    if (!axiosInstance) {
      throw new Error('HTTP client does not support getAxiosInstance');
    }

    const response = await axiosInstance.put(endpoint, buffer, {
      headers: { 'Content-Type': contentType },
    });

    return response.data;
  }

  /**
   * Скачать файл — возвращает содержимое как Buffer вместе с заголовком
   * `Content-Type` ответа (если он есть).
   */
  protected async downloadFile(endpoint: string): Promise<DownloadedFile> {
    this.logger.debug(`BaseOperation: downloading file from ${endpoint}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosInstance = this.httpClient.getAxiosInstance?.() as any;
    if (!axiosInstance) {
      throw new Error('HTTP client does not support getAxiosInstance');
    }

    const response = await axiosInstance.get(endpoint, { responseType: 'arraybuffer' });
     
    const contentType: unknown = response.headers?.['content-type'];

    return {
      content: Buffer.from(response.data),
      ...(typeof contentType === 'string' && { contentType }),
    };
  }
}
