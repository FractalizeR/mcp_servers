/**
 * Bulk Change Service - сервис для массовых операций над задачами
 *
 * Ответственность:
 * - Массовое обновление задач
 * - Массовая смена статусов (transitions)
 * - Массовое перемещение задач между очередями
 * - Получение статуса bulk операции
 *
 * Архитектура:
 * - Прямая инъекция операций через декораторы (@injectable + @inject)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 *
 * ВАЖНО: Все bulk операции асинхронные - они создают операцию
 * и возвращают её ID. Статус операции можно проверить через getBulkChangeStatus().
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 * В отличие от Operations/Tools (ручная регистрация), новые сервисы
 * используют декораторы для более чистого и type-safe кода.
 */

import { injectable, inject } from 'inversify';
import { BulkUpdateIssuesOperation } from '#tracker_api/api_operations/bulk-change/bulk-update.operation.js';
import { BulkTransitionIssuesOperation } from '#tracker_api/api_operations/bulk-change/bulk-transition.operation.js';
import { BulkMoveIssuesOperation } from '#tracker_api/api_operations/bulk-change/bulk-move.operation.js';
import { GetBulkChangeStatusOperation } from '#tracker_api/api_operations/bulk-change/get-bulk-change-status.operation.js';
import type {
  BulkUpdateIssuesInputDto,
  BulkTransitionIssuesInputDto,
  BulkMoveIssuesInputDto,
} from '#tracker_api/dto/index.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';

@injectable()
export class BulkChangeService {
  constructor(
    @inject(BulkUpdateIssuesOperation)
    private readonly bulkUpdateIssuesOp: BulkUpdateIssuesOperation,
    @inject(BulkTransitionIssuesOperation)
    private readonly bulkTransitionIssuesOp: BulkTransitionIssuesOperation,
    @inject(BulkMoveIssuesOperation)
    private readonly bulkMoveIssuesOp: BulkMoveIssuesOperation,
    @inject(GetBulkChangeStatusOperation)
    private readonly getBulkChangeStatusOp: GetBulkChangeStatusOperation
  ) {}

  /**
   * Выполняет массовое обновление задач
   *
   * Операция асинхронная - возвращает объект операции с ID.
   * Используйте getBulkChangeStatus() для отслеживания прогресса.
   *
   * @param params - параметры массового обновления (issues, values)
   * @returns созданная bulk операция
   *
   * @example
   * ```typescript
   * const operation = await bulkChangeService.bulkUpdateIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'],
   *   values: {
   *     priority: 'minor',
   *     tags: { add: ['bug'] }
   *   }
   * });
   * // Проверить статус позже
   * const status = await bulkChangeService.getBulkChangeStatus(operation.id);
   * ```
   */
  async bulkUpdateIssues(
    params: BulkUpdateIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    return this.bulkUpdateIssuesOp.execute(params);
  }

  /**
   * Выполняет массовую смену статусов задач
   *
   * Операция асинхронная - возвращает объект операции с ID.
   * Используйте getBulkChangeStatus() для отслеживания прогресса.
   *
   * @param params - параметры массового перехода (issues, transition, values)
   * @returns созданная bulk операция
   *
   * @example
   * ```typescript
   * // Простой переход
   * const operation = await bulkChangeService.bulkTransitionIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2'],
   *   transition: 'start_progress'
   * });
   *
   * // С установкой resolution
   * const operation = await bulkChangeService.bulkTransitionIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2'],
   *   transition: 'close',
   *   values: { resolution: 'fixed' }
   * });
   * ```
   */
  async bulkTransitionIssues(
    params: BulkTransitionIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    return this.bulkTransitionIssuesOp.execute(params);
  }

  /**
   * Выполняет массовое перемещение задач между очередями
   *
   * Операция асинхронная - возвращает объект операции с ID.
   * Используйте getBulkChangeStatus() для отслеживания прогресса.
   *
   * @param params - параметры массового перемещения (issues, queue, moveAllFields)
   * @returns созданная bulk операция
   *
   * @example
   * ```typescript
   * // Простое перемещение
   * const operation = await bulkChangeService.bulkMoveIssues({
   *   issues: ['QUEUE1-1', 'QUEUE1-2'],
   *   queue: 'QUEUE2'
   * });
   *
   * // С сохранением всех полей
   * const operation = await bulkChangeService.bulkMoveIssues({
   *   issues: ['QUEUE1-1', 'QUEUE1-2'],
   *   queue: 'QUEUE2',
   *   moveAllFields: true
   * });
   * ```
   */
  async bulkMoveIssues(
    params: BulkMoveIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    return this.bulkMoveIssuesOp.execute(params);
  }

  /**
   * Получает текущий статус bulk операции
   *
   * Используется для мониторинга прогресса асинхронных операций
   * (bulkUpdateIssues, bulkTransitionIssues, bulkMoveIssues).
   *
   * @param operationId - идентификатор операции (из response.id при создании)
   * @returns актуальная информация о статусе операции
   *
   * @example
   * ```typescript
   * const status = await bulkChangeService.getBulkChangeStatus('12345');
   * console.log(`Статус: ${status.status}, прогресс: ${status.progress}%`);
   * console.log(`Обработано: ${status.processedIssues}/${status.totalIssues}`);
   * ```
   */
  async getBulkChangeStatus(operationId: string): Promise<BulkChangeOperationWithUnknownFields> {
    return this.getBulkChangeStatusOp.execute(operationId);
  }
}
