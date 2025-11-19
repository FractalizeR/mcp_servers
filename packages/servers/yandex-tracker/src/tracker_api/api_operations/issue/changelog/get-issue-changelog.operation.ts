/**
 * Операция получения истории изменений задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение истории изменений задачи (GET /v3/issues/{issueKey}/changelog)
 * - НЕТ создания/обновления/удаления
 * - НЕТ других операций с задачами
 *
 * Документация Python SDK:
 * - yandex_tracker_client/collections.py:638 - changelog property
 * - yandex_tracker_client/collections.py:1073 - IssueChangelog collection
 *
 * API v3: GET /v3/issues/{issueKey}/changelog
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { ChangelogEntryWithUnknownFields } from '@tracker_api/entities/index.js';

export class GetIssueChangelogOperation extends BaseOperation {
  /**
   * Получает историю изменений задачи
   *
   * @param issueKey - ключ задачи (например, 'QUEUE-123')
   * @returns массив записей истории изменений
   * @throws {Error} если задача не найдена или произошла ошибка API
   *
   * ВАЖНО:
   * - История возвращается в хронологическом порядке (от старых к новым)
   * - Каждая запись содержит информацию об изменённых полях, авторе и времени
   * - Кеширование НЕ используется (история может часто меняться)
   */
  async execute(issueKey: string): Promise<ChangelogEntryWithUnknownFields[]> {
    this.logger.info(`Получение истории изменений задачи: ${issueKey}`);

    // API v3: GET /v3/issues/{issueKey}/changelog
    // Возвращает массив записей истории
    const changelog = await this.httpClient.get<ChangelogEntryWithUnknownFields[]>(
      `/v3/issues/${issueKey}/changelog`
    );

    this.logger.info(`История изменений получена: ${changelog.length} записей`);
    return changelog;
  }
}
