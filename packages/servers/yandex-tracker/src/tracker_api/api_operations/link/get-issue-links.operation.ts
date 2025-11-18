/**
 * Операция получения списка связей задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение связей конкретной задачи
 * - Кеширование результатов
 * - НЕТ создания/удаления связей
 *
 * Соответствует API v3: GET /v3/issues/{issueId}/links
 *
 * ВАЖНО:
 * - Возвращает массив связей (не батч-операция)
 * - Кеширование работает для каждой задачи индивидуально
 * - Retry логика встроена в HttpClient
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { LinkWithUnknownFields } from '@tracker_api/entities/index.js';

export class GetIssueLinksOperation extends BaseOperation {
  /**
   * Получает все связи для указанной задачи
   *
   * @param issueId - ключ или ID задачи (например, 'QUEUE-123' или 'abc123')
   * @returns массив связей задачи
   *
   * ВАЖНО:
   * - Использует кеширование через EntityCacheKey
   * - Retry автоматически обрабатывается в HttpClient
   * - API возвращает пустой массив, если связей нет
   */
  async execute(issueId: string): Promise<LinkWithUnknownFields[]> {
    this.logger.info(`Получение связей для задачи: ${issueId}`);

    // Создаём ключ кеша для связей задачи
    const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, `${issueId}/links`);

    return this.withCache(cacheKey, async () => {
      // Выполняем GET запрос к API
      const response = await this.httpClient.get<LinkWithUnknownFields[]>(
        `/v3/issues/${issueId}/links`
      );

      this.logger.debug(`Получено ${response.length} связей для задачи ${issueId}`);

      return response;
    });
  }
}
