/**
 * Операция получения статуса bulk операции
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение статуса bulk операции по ID
 * - Отправка GET запроса на /v3/bulkchange/{operationId}
 * - Возврат актуального статуса операции
 * - НЕТ ожидания завершения (используется для polling)
 * - НЕТ автоматического повтора (один запрос = один статус)
 *
 * API: GET /v3/bulkchange/{operationId}
 */

import { BaseOperation } from '../base-operation.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';

export class GetBulkChangeStatusOperation extends BaseOperation {
  /**
   * Получить актуальный статус bulk операции
   *
   * @param operationId - идентификатор операции (из response.id при создании)
   * @returns актуальная информация о статусе операции
   *
   * ВАЖНО:
   * - Используется для polling статуса асинхронных операций
   * - НЕ ждёт завершения операции
   * - Возвращает мгновенный снапшот состояния
   * - Для ожидания завершения реализуй polling в вызывающем коде
   *
   * Подтверждённые статусы — `CREATED`, `COMPLETE`, `FAILED`; перечень официально
   * не опубликован и полным не считается (см. `BulkChangeStatus`). Терминальными
   * при ожидании завершения считай `COMPLETE` и `FAILED` — так делает референсный
   * клиент (`yandex_tracker_client/collections.py:1573`).
   *
   * @example
   * ```typescript
   * const status = await getBulkStatus.execute('12345');
   * console.log(`Статус: ${status.status} (${status.statusText})`);
   * console.log(`Обработано: ${status.totalCompletedIssues}/${status.totalIssues}`);
   * ```
   */
  async execute(operationId: string): Promise<BulkChangeOperationWithUnknownFields> {
    this.logger.debug(`Получение статуса bulk операции: ${operationId}`);

    const endpoint = `/v3/bulkchange/${operationId}`;

    const response = await this.httpClient.get<BulkChangeOperationWithUnknownFields>(endpoint);

    this.logger.debug(
      `Bulk операция ${operationId}: статус ${response.status}, ` +
        `обработано задач ${response.executionIssuePercent ?? 'N/A'}%`
    );

    return response;
  }
}
