/**
 * Операция получения обязательных полей очереди в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка полей очереди
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v3/queues/{queueId}/fields
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { GetQueueFieldsDto, QueueFieldsOutput } from '@tracker_api/dto/index.js';

export class GetQueueFieldsOperation extends BaseOperation {
  /**
   * Получает список обязательных полей очереди
   *
   * @param params - параметры запроса (queueId)
   * @returns массив полей очереди
   *
   * ВАЖНО:
   * - Возвращает только обязательные поля (required: true)
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   */
  async execute(params: GetQueueFieldsDto): Promise<QueueFieldsOutput> {
    const { queueId } = params;

    this.logger.info(`Получение обязательных полей очереди: ${queueId}`);

    const fields = await this.httpClient.get<QueueFieldsOutput>(`/v3/queues/${queueId}/fields`);

    this.logger.info(`Получено ${fields.length} полей для очереди ${queueId}`);

    return fields;
  }
}
