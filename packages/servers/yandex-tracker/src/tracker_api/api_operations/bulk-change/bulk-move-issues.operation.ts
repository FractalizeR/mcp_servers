/**
 * Операция массового перемещения задач между очередями
 *
 * Ответственность (SRP):
 * - ТОЛЬКО массовое перемещение задач в другую очередь
 * - Отправка POST запроса на /v3/bulkchange/_move
 * - Возврат информации об операции (для мониторинга статуса)
 * - НЕТ ожидания завершения (асинхронная операция)
 * - НЕТ polling статуса (делается через GetBulkChangeStatusOperation)
 *
 * API: POST /v3/bulkchange/_move
 *
 * Существование этого маршрута под v3 подтверждено только по аналогии с v2 (пишущий
 * эндпоинт, живым пробоем не проверить) — в отличие от `/v3/bulkchange/{id}`, который
 * подтверждён read-only оракулом. См. `inventory/v2-paths-2026-08-24.md` (раздел bulkchange).
 */

import { BaseOperation } from '../base-operation.js';
import type { BulkMoveIssuesInputDto } from '#tracker_api/dto/index.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';

export class BulkMoveIssuesOperation extends BaseOperation {
  /**
   * Выполнить массовое перемещение задач в другую очередь
   *
   * @param params - параметры массового перемещения (issues + queue + values)
   * @returns информация о запущенной операции (id, status, self)
   *
   * ВАЖНО:
   * - Операция выполняется асинхронно на сервере
   * - Возвращает operationId для проверки статуса
   * - НЕ ждёт завершения операции
   * - Для проверки статуса используй GetBulkChangeStatusOperation
   * - По умолчанию перемещаются только стандартные поля
   * - Для перемещения всех полей установи moveAllFields: true
   *
   * @example
   * ```typescript
   * // Простое перемещение
   * const operation = await bulkMove.execute({
   *   issues: ['QUEUE1-1', 'QUEUE1-2'],
   *   queue: 'QUEUE2'
   * });
   *
   * // Перемещение с сохранением всех полей
   * const operation = await bulkMove.execute({
   *   issues: ['QUEUE1-1', 'QUEUE1-2'],
   *   queue: 'QUEUE2',
   *   moveAllFields: true,
   *   values: { priority: 'critical' }
   * });
   * ```
   */
  async execute(params: BulkMoveIssuesInputDto): Promise<BulkChangeOperationWithUnknownFields> {
    this.logger.info(
      `Массовое перемещение ${params.issues.length} задач в очередь '${params.queue}'`
    );

    const endpoint = '/v3/bulkchange/_move';

    const requestBody: Record<string, unknown> = {
      issues: params.issues,
      queue: params.queue,
    };

    // Добавляем moveAllFields только если это true
    const moveAllFields = params.moveAllFields;
    if (moveAllFields === true) {
      requestBody['moveAllFields'] = true;
    }

    // Добавляем initialStatus, только если вызывающий явно его задал (true или false) —
    // по умолчанию API сохраняет текущий статус, отправка не нужна
    if (params.initialStatus !== undefined) {
      requestBody['initialStatus'] = params.initialStatus;
    }

    // Добавляем values только если они переданы
    const values = params.values;
    if (values) {
      requestBody['values'] = values;
    }

    const response = await this.httpClient.post<BulkChangeOperationWithUnknownFields>(
      endpoint,
      requestBody
    );

    this.logger.info(`Bulk move операция создана: ${response.id}, статус: ${response.status}`);

    return response;
  }
}
