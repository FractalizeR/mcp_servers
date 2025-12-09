/**
 * Операция массового обновления задач
 *
 * Ответственность (SRP):
 * - ТОЛЬКО массовое обновление полей задач
 * - Отправка POST запроса на /v2/bulkchange/_update
 * - Возврат информации об операции (для мониторинга статуса)
 * - НЕТ ожидания завершения (асинхронная операция)
 * - НЕТ polling статуса (делается через GetBulkChangeStatusOperation)
 *
 * API: POST /v2/bulkchange/_update
 */

import { BaseOperation } from '../base-operation.js';
import type { BulkUpdateIssuesInputDto } from '#tracker_api/dto/index.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';

export class BulkUpdateIssuesOperation extends BaseOperation {
  /**
   * Выполнить массовое обновление задач
   *
   * @param params - параметры массового обновления (issues + values)
   * @returns информация о запущенной операции (id, status, self)
   *
   * ВАЖНО:
   * - Операция выполняется асинхронно на сервере
   * - Возвращает operationId для проверки статуса
   * - НЕ ждёт завершения операции
   * - Для проверки статуса используй GetBulkChangeStatusOperation
   *
   * @example
   * ```typescript
   * const operation = await bulkUpdate.execute({
   *   issues: ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'],
   *   values: {
   *     priority: 'minor',
   *     tags: { add: ['bug'] }
   *   }
   * });
   * // operation = { id: '12345', status: 'PENDING', self: 'https://...' }
   * ```
   */
  async execute(params: BulkUpdateIssuesInputDto): Promise<BulkChangeOperationWithUnknownFields> {
    this.logger.info(
      `Массовое обновление ${params.issues.length} задач: ${params.issues.slice(0, 5).join(', ')}${
        params.issues.length > 5 ? '...' : ''
      }`
    );

    const endpoint = '/v2/bulkchange/_update';

    const response = await this.httpClient.post<BulkChangeOperationWithUnknownFields>(endpoint, {
      issues: params.issues,
      values: params.values,
    });

    this.logger.info(`Bulk update операция создана: ${response.id}, статус: ${response.status}`);

    return response;
  }
}
