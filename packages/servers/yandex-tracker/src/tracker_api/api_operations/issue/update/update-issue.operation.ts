/**
 * Операция обновления задачи в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующей задачи (PATCH /v3/issues/{issueKey})
 * - Инвалидация кеша после успешного обновления
 * - НЕТ создания/получения/удаления задач
 * - НЕТ batch-обновлений (только одна задача за раз)
 *
 * API: PATCH /v3/issues/{issueKey}
 * Документация: yandex_tracker_client/yandex_tracker_client/methods/issues.py::update_issue()
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { UpdateIssueDto } from '#tracker_api/dto/index.js';

export class UpdateIssueOperation extends BaseOperation {
  /**
   * Обновляет задачу в Яндекс.Трекере
   *
   * @param issueKey - ключ задачи (например, 'QUEUE-123')
   * @param updateData - данные для обновления (частичное обновление, все поля опциональны)
   * @param version - версия задачи для optimistic locking (query-параметр `version` у PATCH).
   *   Если задача на сервере уже другой версии (параллельное изменение), API вернёт ошибку
   *   конфликта вместо молчаливой перезаписи. Не путать с заголовком `If-Match`, который шлёт
   *   референсный Python-клиент — текущая документация API описывает именно query-параметр,
   *   и сам референсный клиент помечает надёжность заголовка как сомнительную (см. README операции).
   * @returns обновлённую задачу с полным набором полей
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - После успешного обновления инвалидирует кеш для данной задачи
   * - Retry делается автоматически в HttpClient.patch
   * - Возвращает полный объект задачи после обновления
   */
  async execute(
    issueKey: string,
    updateData: UpdateIssueDto,
    version?: number
  ): Promise<IssueWithUnknownFields> {
    this.logger.info(`Обновление задачи ${issueKey}`, {
      fields: Object.keys(updateData),
    });

    const queryParams = new URLSearchParams();
    if (version !== undefined) {
      queryParams.append('version', String(version));
    }
    const endpoint = `/v3/issues/${issueKey}${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    // Выполняем PATCH запрос (retry встроен в httpClient)
    const updatedIssue = await this.httpClient.patch<IssueWithUnknownFields>(endpoint, updateData);

    // Инвалидируем кеш для обновлённой задачи
    const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, issueKey);
    await this.cacheManager.delete(cacheKey);

    this.logger.info(`Задача ${issueKey} успешно обновлена`);

    return updatedIssue;
  }
}
