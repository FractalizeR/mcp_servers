/**
 * Операция создания задачи в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание одной задачи
 * - Кеширование созданной задачи по её ключу
 * - НЕТ обновления/удаления/получения
 * - НЕТ batch-операций
 *
 * API: POST /v3/issues
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { CreateIssueDto } from '@tracker_api/dto/index.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';

export class CreateIssueOperation extends BaseOperation {
  /**
   * Создаёт новую задачу в Яндекс.Трекере
   *
   * @param issueData - данные для создания задачи
   * @returns созданная задача с полными данными
   * @throws {Error} если не указаны обязательные поля (queue, summary)
   *
   * ВАЖНО:
   * - После создания задача автоматически кешируется по её ключу
   * - Retry делается ТОЛЬКО в HttpClient.post (нет двойного retry)
   * - API возвращает полный объект задачи (включая сгенерированный key)
   */
  async execute(issueData: CreateIssueDto): Promise<IssueWithUnknownFields> {
    this.logger.info(`Создание задачи в очереди ${issueData.queue}: "${issueData.summary}"`);

    // Создаём задачу через API
    // HttpClient.post уже содержит retry логику
    const createdIssue = await this.httpClient.post<IssueWithUnknownFields>(
      '/v3/issues',
      issueData
    );

    // Кешируем созданную задачу по её ключу
    const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, createdIssue.key);
    this.cacheManager.set(cacheKey, createdIssue);

    this.logger.info(`Задача успешно создана: ${createdIssue.key}`);

    return createdIssue;
  }
}
