/**
 * Queue Service - сервис для работы с очередями
 *
 * Ответственность:
 * - Получение списка очередей
 * - Получение одной очереди по ID
 * - Создание новой очереди
 * - Обновление очереди
 * - Получение обязательных полей очереди
 * - Управление правами доступа к очереди
 *
 * Архитектура:
 * - Инъекция операций через QueueOperationsContainer (Parameter Object pattern)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 */

import { injectable, inject } from 'inversify';
import { QueueOperationsContainer } from './containers/index.js';
import type {
  GetQueuesDto,
  GetQueueDto,
  CreateQueueDto,
  GetQueueFieldsDto,
  QueueOutput,
  QueuesListOutput,
  QueueFieldsOutput,
  QueuePermissionsOutput,
} from '#tracker_api/dto/index.js';
import type {
  UpdateQueueParams,
  ManageQueueAccessParams,
} from '#tracker_api/api_operations/index.js';

@injectable()
export class QueueService {
  constructor(@inject(QueueOperationsContainer) private readonly ops: QueueOperationsContainer) {}

  /**
   * Получает список очередей
   * @param params - параметры запроса (опционально)
   * @returns массив очередей
   */
  async getQueues(params?: GetQueuesDto): Promise<QueuesListOutput> {
    return this.ops.getQueues.execute(params);
  }

  /**
   * Получает одну очередь по ID или ключу
   * @param params - параметры запроса (queueId, expand)
   * @returns очередь с полными данными
   */
  async getQueue(params: GetQueueDto): Promise<QueueOutput> {
    return this.ops.getQueue.execute(params);
  }

  /**
   * Создаёт новую очередь
   * @param queueData - данные очереди
   * @returns созданная очередь
   */
  async createQueue(queueData: CreateQueueDto): Promise<QueueOutput> {
    return this.ops.createQueue.execute(queueData);
  }

  /**
   * Обновляет существующую очередь
   * @param params - параметры (queueId и updates)
   * @returns обновлённая очередь
   */
  async updateQueue(params: UpdateQueueParams): Promise<QueueOutput> {
    return this.ops.updateQueue.execute(params);
  }

  /**
   * Получает список обязательных полей очереди
   * @param params - параметры запроса (queueId)
   * @returns массив полей очереди
   */
  async getQueueFields(params: GetQueueFieldsDto): Promise<QueueFieldsOutput> {
    return this.ops.getQueueFields.execute(params);
  }

  /**
   * Управляет правами доступа к очереди
   * @param params - параметры (queueId и accessData)
   * @returns массив прав доступа
   */
  async manageQueueAccess(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
    return this.ops.manageQueueAccess.execute(params);
  }
}
