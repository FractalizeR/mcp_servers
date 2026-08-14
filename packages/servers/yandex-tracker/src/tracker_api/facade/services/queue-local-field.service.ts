/**
 * Queue Local Field Service - сервис для работы с локальными полями очереди
 *
 * Ответственность:
 * - Список локальных полей очереди, создание, обновление
 *
 * Архитектура: прямая инъекция операций через декораторы, без зависимостей
 * от других сервисов.
 */

import { injectable, inject } from 'inversify';
import {
  GetQueueLocalFieldsOperation,
  CreateQueueLocalFieldOperation,
  UpdateQueueLocalFieldOperation,
} from '#tracker_api/api_operations/queue-local-field/index.js';
import type {
  GetQueueLocalFieldsDto,
  CreateQueueLocalFieldDto,
  UpdateQueueLocalFieldDto,
} from '#tracker_api/dto/index.js';
import type {
  QueueLocalFieldWithUnknownFields,
  PaginatedResult,
} from '#tracker_api/entities/index.js';

@injectable()
export class QueueLocalFieldService {
  constructor(
    @inject(GetQueueLocalFieldsOperation)
    private readonly getFieldsOp: GetQueueLocalFieldsOperation,
    @inject(CreateQueueLocalFieldOperation)
    private readonly createFieldOp: CreateQueueLocalFieldOperation,
    @inject(UpdateQueueLocalFieldOperation)
    private readonly updateFieldOp: UpdateQueueLocalFieldOperation
  ) {}

  async getQueueLocalFields(
    dto: GetQueueLocalFieldsDto
  ): Promise<PaginatedResult<QueueLocalFieldWithUnknownFields>> {
    return this.getFieldsOp.execute(dto);
  }

  async createQueueLocalField(
    dto: CreateQueueLocalFieldDto
  ): Promise<QueueLocalFieldWithUnknownFields> {
    return this.createFieldOp.execute(dto);
  }

  async updateQueueLocalField(
    dto: UpdateQueueLocalFieldDto
  ): Promise<QueueLocalFieldWithUnknownFields> {
    return this.updateFieldOp.execute(dto);
  }
}
