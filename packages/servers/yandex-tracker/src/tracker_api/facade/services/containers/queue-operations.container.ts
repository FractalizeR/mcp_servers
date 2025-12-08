/**
 * QueueOperations Container
 *
 * Группирует все операции связанные с очередями в один injectable контейнер.
 * Используется для уменьшения количества параметров конструктора QueueService.
 *
 * Паттерн: Parameter Object + Dependency Injection
 */

import { injectable, inject } from 'inversify';
import { GetQueuesOperation } from '#tracker_api/api_operations/queue/get-queues.operation.js';
import { GetQueueOperation } from '#tracker_api/api_operations/queue/get-queue.operation.js';
import { CreateQueueOperation } from '#tracker_api/api_operations/queue/create-queue.operation.js';
import { UpdateQueueOperation } from '#tracker_api/api_operations/queue/update-queue.operation.js';
import { GetQueueFieldsOperation } from '#tracker_api/api_operations/queue/get-queue-fields.operation.js';
import { ManageQueueAccessOperation } from '#tracker_api/api_operations/queue/manage-queue-access.operation.js';

@injectable()
export class QueueOperationsContainer {
  constructor(
    @inject(GetQueuesOperation) readonly getQueues: GetQueuesOperation,
    @inject(GetQueueOperation) readonly getQueue: GetQueueOperation,
    @inject(CreateQueueOperation) readonly createQueue: CreateQueueOperation,
    @inject(UpdateQueueOperation) readonly updateQueue: UpdateQueueOperation,
    @inject(GetQueueFieldsOperation) readonly getQueueFields: GetQueueFieldsOperation,
    @inject(ManageQueueAccessOperation) readonly manageQueueAccess: ManageQueueAccessOperation
  ) {}
}
