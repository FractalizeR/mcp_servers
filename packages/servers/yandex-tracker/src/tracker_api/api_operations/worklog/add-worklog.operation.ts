/**
 * Операция добавления записи времени к задаче
 *
 * Ответственность (SRP):
 * - ТОЛЬКО добавление записи времени к задаче
 * - Конвертация human-readable duration в ISO 8601
 * - НЕТ получения/редактирования/удаления записей
 * - НЕТ batch-операций
 *
 * API: POST /v2/issues/{issueId}/worklog
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { DurationUtil } from '@tracker_api/utils/duration.util.js';
import type { AddWorklogInput } from '@tracker_api/dto/index.js';
import type { WorklogWithUnknownFields } from '@tracker_api/entities/index.js';

export class AddWorklogOperation extends BaseOperation {
  /**
   * Добавляет запись времени к задаче
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - данные записи времени
   * @returns созданная запись времени
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.post
   * - API возвращает полный объект записи времени
   * - duration автоматически конвертируется в ISO 8601, если передан в human-readable формате
   * - Эндпоинт из API v2 (не v3!)
   */
  async execute(issueId: string, input: AddWorklogInput): Promise<WorklogWithUnknownFields> {
    this.logger.info(`Добавление записи времени к задаче ${issueId}`);

    // Подготовка payload - конвертация duration если нужно
    const payload = {
      ...input,
      // Конвертируем duration в ISO 8601, если это human-readable формат
      duration: DurationUtil.isValidIsoDuration(input.duration)
        ? input.duration
        : DurationUtil.parseHumanReadable(input.duration),
    };

    this.logger.debug(`Payload для API:`, {
      issueId,
      start: payload.start,
      duration: payload.duration,
      hasComment: !!payload.comment,
    });

    const worklog = await this.httpClient.post<WorklogWithUnknownFields>(
      `/v2/issues/${issueId}/worklog`,
      payload
    );

    this.logger.info(`Запись времени успешно добавлена к задаче ${issueId}: ${worklog.id}`);

    return worklog;
  }
}
