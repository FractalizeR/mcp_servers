/**
 * Операция массовой смены статусов задач
 *
 * Ответственность (SRP):
 * - ТОЛЬКО массовая смена статусов задач (transition)
 * - Отправка POST запроса на /v3/bulkchange/_transition
 * - Возврат информации об операции (для мониторинга статуса)
 * - НЕТ ожидания завершения (асинхронная операция)
 * - НЕТ polling статуса (делается через GetBulkChangeStatusOperation)
 *
 * API: POST /v3/bulkchange/_transition
 *
 * Существование этого маршрута под v3 подтверждено только по аналогии с v2 (пишущий
 * эндпоинт, живым пробоем не проверить) — в отличие от `/v3/bulkchange/{id}`, который
 * подтверждён read-only оракулом. См. `inventory/v2-paths-2026-08-24.md` (раздел bulkchange).
 */

import { BaseOperation } from '../base-operation.js';
import type { BulkTransitionIssuesInputDto } from '#tracker_api/dto/index.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';

export class BulkTransitionIssuesOperation extends BaseOperation {
  /**
   * Выполнить массовую смену статусов задач
   *
   * @param params - параметры массового перехода (issues + transition + values)
   * @returns информация о запущенной операции (id, status, self)
   *
   * ВАЖНО:
   * - Операция выполняется асинхронно на сервере
   * - Возвращает operationId для проверки статуса
   * - НЕ ждёт завершения операции
   * - Для проверки статуса используй GetBulkChangeStatusOperation
   * - Некоторые переходы требуют дополнительных полей (например, resolution для 'close')
   *
   * @example
   * ```typescript
   * // Простой переход
   * const operation = await bulkTransition.execute({
   *   issues: ['QUEUE-1', 'QUEUE-2'],
   *   transition: 'start_progress'
   * });
   *
   * // Переход с установкой resolution
   * const operation = await bulkTransition.execute({
   *   issues: ['QUEUE-1', 'QUEUE-2'],
   *   transition: 'close',
   *   values: { resolution: 'fixed' }
   * });
   * ```
   */
  async execute(
    params: BulkTransitionIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    this.logger.info(
      `Массовая смена статуса для ${params.issues.length} задач: переход '${params.transition}'`
    );

    const endpoint = '/v3/bulkchange/_transition';

    const requestBody: Record<string, unknown> = {
      issues: params.issues,
      transition: params.transition,
    };

    // Добавляем values только если они переданы
    const values = params.values;
    if (values) {
      requestBody['values'] = values;
    }

    const response = await this.httpClient.post<BulkChangeOperationWithUnknownFields>(
      endpoint,
      requestBody
    );

    this.logger.info(
      `Bulk transition операция создана: ${response.id}, статус: ${response.status}`
    );

    return response;
  }
}
