/**
 * Операция обновления записи времени
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующей записи времени
 * - Конвертация human-readable duration в ISO 8601
 * - НЕТ добавления/получения/удаления записей
 *
 * API: PATCH /v2/issues/{issueId}/worklog/{worklogId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { DurationUtil } from '@tracker_api/utils/duration.util.js';
import type { UpdateWorklogInput } from '@tracker_api/dto/index.js';
import type { WorklogWithUnknownFields } from '@tracker_api/entities/index.js';

export class UpdateWorklogOperation extends BaseOperation {
  /**
   * Обновляет запись времени
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param worklogId - идентификатор записи времени
   * @param input - новые данные записи времени
   * @returns обновлённая запись времени
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.patch
   * - API возвращает полный объект обновлённой записи времени
   * - duration автоматически конвертируется в ISO 8601, если передан в human-readable формате
   * - Эндпоинт из API v2 (не v3!)
   */
  async execute(
    issueId: string,
    worklogId: string,
    input: UpdateWorklogInput
  ): Promise<WorklogWithUnknownFields> {
    this.logger.info(`Обновление записи времени ${worklogId} задачи ${issueId}`);

    // Подготовка payload - конвертация duration если нужно
    const payload = { ...input };

    // Конвертируем duration в ISO 8601, если он передан и в human-readable формате
    if (input.duration !== undefined) {
      payload.duration = DurationUtil.isValidIsoDuration(input.duration)
        ? input.duration
        : DurationUtil.parseHumanReadable(input.duration);
    }

    this.logger.debug(`Payload для API:`, {
      issueId,
      worklogId,
      start: payload.start,
      duration: payload.duration,
      hasComment: !!payload.comment,
    });

    const worklog = await this.httpClient.patch<WorklogWithUnknownFields>(
      `/v2/issues/${issueId}/worklog/${worklogId}`,
      payload
    );

    this.logger.info(`Запись времени ${worklogId} задачи ${issueId} успешно обновлена`);

    return worklog;
  }
}
