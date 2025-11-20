/**
 * Операция выполнения перехода статуса задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО выполнение перехода статуса (POST /v3/issues/{issueKey}/transitions/{transitionId}/_execute)
 * - НЕТ получения списка переходов
 * - НЕТ других операций с задачами
 *
 * Документация Python SDK:
 * - yandex_tracker_client/collections.py:894 - execute method
 * - yandex_tracker_client/collections.py:882 - IssueTransitions collection
 *
 * API v3: POST /v3/issues/{issueKey}/transitions/{transitionId}/_execute
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ExecuteTransitionDto } from '#tracker_api/dto/index.js';

export class TransitionIssueOperation extends BaseOperation {
  /**
   * Выполняет переход задачи в другой статус
   *
   * @param issueKey - ключ задачи (например, 'QUEUE-123')
   * @param transitionId - идентификатор перехода (из GetIssueTransitionsOperation)
   * @param transitionData - данные для заполнения при переходе (опционально)
   * @returns обновлённая задача после перехода
   * @throws {Error} если переход недоступен или произошла ошибка API
   *
   * ВАЖНО:
   * - Переход должен быть доступен из текущего статуса (проверяй через GetIssueTransitionsOperation)
   * - После выполнения кеш задачи инвалидируется
   * - Можно передать дополнительные данные (например, комментарий)
   */
  async execute(
    issueKey: string,
    transitionId: string,
    transitionData?: ExecuteTransitionDto
  ): Promise<IssueWithUnknownFields> {
    this.logger.info(`Выполнение перехода ${transitionId} для задачи ${issueKey}`, {
      hasData: !!transitionData,
    });

    // API v3: POST /v3/issues/{issueKey}/transitions/{transitionId}/_execute
    const result = await this.httpClient.post<IssueWithUnknownFields>(
      `/v3/issues/${issueKey}/transitions/${transitionId}/_execute`,
      transitionData ?? {}
    );

    // Инвалидируем кеш задачи после изменения статуса
    const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, issueKey);
    this.cacheManager.delete(cacheKey);

    this.logger.info(`Переход выполнен успешно: ${issueKey} → ${result.status?.key ?? 'unknown'}`);
    return result;
  }
}
