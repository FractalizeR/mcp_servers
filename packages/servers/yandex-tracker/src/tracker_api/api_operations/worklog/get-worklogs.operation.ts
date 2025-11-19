/**
 * Операция получения списка записей времени задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение записей времени задачи
 * - НЕТ добавления/редактирования/удаления записей
 *
 * API: GET /v2/issues/{issueId}/worklog
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { WorklogWithUnknownFields } from '@tracker_api/entities/index.js';

export class GetWorklogsOperation extends BaseOperation {
  /**
   * Получает список записей времени задачи
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @returns массив записей времени
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.get
   * - API возвращает массив записей времени
   * - Эндпоинт из API v2 (не v3!)
   */
  async execute(issueId: string): Promise<WorklogWithUnknownFields[]> {
    this.logger.info(`Получение записей времени задачи ${issueId}`);

    const endpoint = `/v2/issues/${issueId}/worklog`;

    const worklogs = await this.httpClient.get<WorklogWithUnknownFields[]>(endpoint);

    this.logger.info(
      `Получено ${Array.isArray(worklogs) ? worklogs.length : 1} записей времени для задачи ${issueId}`
    );

    return Array.isArray(worklogs) ? worklogs : [worklogs];
  }
}
