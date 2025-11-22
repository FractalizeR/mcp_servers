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
 * - Прямая инъекция операций через декораторы (@injectable + @inject)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 * В отличие от Operations/Tools (ручная регистрация), новые сервисы
 * используют декораторы для более чистого и type-safe кода.
 */

import { injectable, inject } from 'inversify';
import { GetQueuesOperation } from '#tracker_api/api_operations/queue/get-queues.operation.js';
import { GetQueueOperation } from '#tracker_api/api_operations/queue/get-queue.operation.js';
import { CreateQueueOperation } from '#tracker_api/api_operations/queue/create-queue.operation.js';
import { UpdateQueueOperation } from '#tracker_api/api_operations/queue/update-queue.operation.js';
import { GetQueueFieldsOperation } from '#tracker_api/api_operations/queue/get-queue-fields.operation.js';
import { ManageQueueAccessOperation } from '#tracker_api/api_operations/queue/manage-queue-access.operation.js';
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
  constructor(
    @inject(GetQueuesOperation)
    private readonly getQueuesOp: GetQueuesOperation,
    @inject(GetQueueOperation)
    private readonly getQueueOp: GetQueueOperation,
    @inject(CreateQueueOperation)
    private readonly createQueueOp: CreateQueueOperation,
    @inject(UpdateQueueOperation)
    private readonly updateQueueOp: UpdateQueueOperation,
    @inject(GetQueueFieldsOperation)
    private readonly getQueueFieldsOp: GetQueueFieldsOperation,
    @inject(ManageQueueAccessOperation)
    private readonly manageQueueAccessOp: ManageQueueAccessOperation
  ) {}

  /**
   * Получает список очередей
   * @param params - параметры запроса (опционально)
   * @returns массив очередей
   */
  async getQueues(params?: GetQueuesDto): Promise<QueuesListOutput> {
    return this.getQueuesOp.execute(params);
  }

  /**
   * Получает одну очередь по ID или ключу
   * @param params - параметры запроса (queueId, expand)
   * @returns очередь с полными данными
   */
  async getQueue(params: GetQueueDto): Promise<QueueOutput> {
    return this.getQueueOp.execute(params);
  }

  /**
   * Создаёт новую очередь
   * @param queueData - данные очереди
   * @returns созданная очередь
   */
  async createQueue(queueData: CreateQueueDto): Promise<QueueOutput> {
    return this.createQueueOp.execute(queueData);
  }

  /**
   * Обновляет существующую очередь
   * @param params - параметры (queueId и updates)
   * @returns обновлённая очередь
   */
  async updateQueue(params: UpdateQueueParams): Promise<QueueOutput> {
    return this.updateQueueOp.execute(params);
  }

  /**
   * Получает список обязательных полей очереди
   * @param params - параметры запроса (queueId)
   * @returns массив полей очереди
   */
  async getQueueFields(params: GetQueueFieldsDto): Promise<QueueFieldsOutput> {
    return this.getQueueFieldsOp.execute(params);
  }

  /**
   * Управляет правами доступа к очереди
   * @param params - параметры (queueId и accessData)
   * @returns массив прав доступа
   */
  async manageQueueAccess(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
    return this.manageQueueAccessOp.execute(params);
  }
}
