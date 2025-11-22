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

import type { IHttpClient, CacheManager, Logger } from '@mcp-framework/infrastructure';

export abstract class BaseOperation {
  constructor(
    protected readonly httpClient: IHttpClient,
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
    const cached = await this.cacheManager.get<T>(cacheKey);

    if (cached !== null) {
      this.logger.debug(`Operation cache hit: ${cacheKey}`);
      return cached;
    }

    // Кеш пуст, выполняем функцию
    this.logger.debug(`Operation cache miss: ${cacheKey}`);
    const result = await fn();

    // Сохраняем в кеш
    await this.cacheManager.set(cacheKey, result);

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

  /**
   * Выполнить DELETE запрос
   *
   * Обертка над httpClient.delete с логированием.
   * Используется для удаления ресурсов (комментарии, связи, вложения, etc).
   *
   * @param endpoint - путь к ресурсу (относительно baseURL)
   * @returns результат выполнения DELETE запроса
   *
   * @example
   * ```typescript
   * await this.deleteRequest<void>('/v2/issues/TEST-1/comments/123');
   * ```
   */
  protected async deleteRequest<TResponse = void>(endpoint: string): Promise<TResponse> {
    this.logger.debug(`BaseOperation: DELETE ${endpoint}`);
    return this.httpClient.delete<TResponse>(endpoint);
  }

  /**
   * Загрузить файл на сервер (multipart/form-data)
   *
   * Используется для загрузки вложений в задачи.
   *
   * ВАЖНО: Метод использует FormData для отправки файла.
   * HttpClient должен автоматически установить правильный Content-Type.
   *
   * @param endpoint - путь к ресурсу
   * @param formData - FormData с файлом
   * @returns результат загрузки
   *
   * @example
   * ```typescript
   * const formData = FileUploadUtil.prepareMultipartFormData(
   *   buffer,
   *   'document.pdf'
   * );
   * const attachment = await this.uploadFile<Attachment>(
   *   '/v2/issues/TEST-1/attachments',
   *   formData
   * );
   * ```
   */
  protected async uploadFile<TResponse>(endpoint: string, formData: FormData): Promise<TResponse> {
    this.logger.debug(`BaseOperation: uploading file to ${endpoint}`);

    // Получаем axios instance для прямого доступа
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosInstance = this.httpClient.getAxiosInstance?.() as any;

    if (!axiosInstance) {
      throw new Error('HTTP client does not support getAxiosInstance');
    }

    // Выполняем POST запрос с FormData
     
    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

     
    return response.data;
  }

  /**
   * Скачать файл с сервера
   *
   * Используется для скачивания вложений из задач.
   *
   * ВАЖНО: Метод возвращает файл как Buffer.
   * Для больших файлов может потребоваться stream API.
   *
   * @param endpoint - путь к ресурсу
   * @returns содержимое файла как Buffer
   *
   * @example
   * ```typescript
   * const fileBuffer = await this.downloadFile(
   *   '/v2/issues/TEST-1/attachments/456'
   * );
   * ```
   */
  protected async downloadFile(endpoint: string): Promise<Buffer> {
    this.logger.debug(`BaseOperation: downloading file from ${endpoint}`);

    // Получаем axios instance для прямого доступа
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosInstance = this.httpClient.getAxiosInstance?.() as any;

    if (!axiosInstance) {
      throw new Error('HTTP client does not support getAxiosInstance');
    }

    // Выполняем GET запрос с responseType: 'arraybuffer'
     
    const response = await axiosInstance.get(endpoint, {
      responseType: 'arraybuffer',
    });

    // Преобразуем ArrayBuffer в Buffer
     
    return Buffer.from(response.data);
  }
}
