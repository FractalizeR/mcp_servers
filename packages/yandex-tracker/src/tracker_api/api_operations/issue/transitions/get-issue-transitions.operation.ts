/**
 * Операция получения доступных переходов статусов задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка доступных переходов (GET /v3/issues/{issueKey}/transitions)
 * - НЕТ выполнения переходов
 * - НЕТ других операций с задачами
 *
 * Документация Python SDK:
 * - yandex_tracker_client/collections.py:626 - transitions property
 * - yandex_tracker_client/collections.py:882 - IssueTransitions collection
 *
 * API v3: GET /v3/issues/{issueKey}/transitions
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { TransitionWithUnknownFields } from '@tracker_api/entities/index.js';

export class GetIssueTransitionsOperation extends BaseOperation {
  /**
   * Получает список доступных переходов статусов для задачи
   *
   * @param issueKey - ключ задачи (например, 'QUEUE-123')
   * @returns массив доступных переходов
   * @throws {Error} если задача не найдена или произошла ошибка API
   *
   * ВАЖНО:
   * - Возвращает только те переходы, которые доступны из текущего статуса
   * - Для выполнения перехода используй TransitionIssueOperation
   * - Кеширование НЕ используется (доступные переходы зависят от текущего статуса)
   */
  async execute(issueKey: string): Promise<TransitionWithUnknownFields[]> {
    this.logger.info(`Получение доступных переходов для задачи: ${issueKey}`);

    try {
      // API v3: GET /v3/issues/{issueKey}/transitions
      // Возвращает массив доступных переходов
      const transitions = await this.httpClient.get<TransitionWithUnknownFields[]>(
        `/v3/issues/${issueKey}/transitions`
      );

      this.logger.info(`Доступные переходы получены: ${transitions.length} шт.`);
      return transitions;
    } catch (error: unknown) {
      this.logger.error(`Ошибка при получении переходов для задачи ${issueKey}`, error);
      throw error;
    }
  }
}
