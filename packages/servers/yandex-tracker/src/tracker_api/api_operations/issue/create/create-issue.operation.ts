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

import { randomUUID } from 'node:crypto';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  EntityCacheKey,
  EntityType,
  ApiErrorClass,
  HttpStatusCode,
} from '@fractalizer/mcp-infrastructure';
import type { CreateIssueDto } from '#tracker_api/dto/index.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';

export class CreateIssueOperation extends BaseOperation {
  /**
   * Создаёт новую задачу в Яндекс.Трекере
   *
   * @param issueData - данные для создания задачи
   * @returns созданная задача с полными данными
   * @throws {Error} если не указаны обязательные поля (queue, summary)
   *
   * ВАЖНО (пакет 1.1.C — идемпотентность создания):
   * - Запрос всегда отправляется с ключом идемпотентности `unique`
   *   (переданным вызывающим или сгенерированным здесь: `randomUUID()` без
   *   дефисов — эквивалент `uuid4().hex` референсного Python-клиента).
   * - Благодаря `unique` POST объявляется транспорту идемпотентным
   *   (`idempotencyDeclared: true`), поэтому HttpClient.post безопасно
   *   повторяет его при сетевой ошибке/таймауте/5xx (см.
   *   ExponentialBackoffStrategy).
   * - Если Трекер уже создал задачу с этим `unique` (сервер вернул 409 —
   *   типично именно как результат такого повтора), операция НЕ создаёт
   *   вторую задачу, а находит и возвращает существующую через
   *   `POST /v3/issues/_findByUnique`.
   * - После создания задача автоматически кешируется по её ключу
   * - API возвращает полный объект задачи (включая сгенерированный key)
   */
  async execute(issueData: CreateIssueDto): Promise<IssueWithUnknownFields> {
    this.logger.info(`Создание задачи в очереди ${issueData.queue}: "${issueData.summary}"`);

    const unique = issueData.unique ?? randomUUID().replace(/-/g, '');
    const payload: CreateIssueDto = { ...issueData, unique };

    const createdIssue = await this.createOrFindExisting(payload, unique);

    // Кешируем созданную задачу по её ключу
    const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, createdIssue.key);
    await this.cacheManager.set(cacheKey, createdIssue);

    this.logger.info(`Задача успешно создана: ${createdIssue.key}`);

    return createdIssue;
  }

  /**
   * Создаёт задачу через API; при конфликте `unique` (409) — не создаёт
   * дубль, а находит и возвращает уже существующую задачу.
   *
   * @param payload - данные для создания задачи (с `unique`)
   * @param unique - ключ идемпотентности (для поиска при конфликте)
   */
  private async createOrFindExisting(
    payload: CreateIssueDto,
    unique: string
  ): Promise<IssueWithUnknownFields> {
    try {
      // idempotencyDeclared: true — безопасно для транспортного retry
      // благодаря ключу `unique` в payload.
      return await this.httpClient.post<IssueWithUnknownFields>('/v3/issues', payload, true);
    } catch (error) {
      if (!(error instanceof ApiErrorClass) || error.statusCode !== HttpStatusCode.CONFLICT) {
        throw error;
      }

      this.logger.warn(
        `Конфликт при создании задачи по unique "${unique}" — ищем уже созданную задачу вместо повтора`
      );

      try {
        return await this.findByUnique(unique);
      } catch {
        // Задача с этим unique не нашлась — пробрасываем исходный конфликт,
        // а не ошибку поиска (аналогично референсному Python-клиенту).
        throw error;
      }
    }
  }

  /**
   * Находит задачу по ключу идемпотентности `unique`.
   * Используется при конфликте создания (409), когда задача с этим `unique`
   * уже существует — типичный результат повтора POST /v3/issues.
   */
  private async findByUnique(unique: string): Promise<IssueWithUnknownFields> {
    const { data } = await this.httpClient.postWithResponse<IssueWithUnknownFields>(
      '/v3/issues/_findByUnique',
      undefined,
      { unique }
    );
    return data;
  }
}
