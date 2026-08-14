/**
 * Операция получения списка локальных полей очереди
 *
 * API: GET /v3/queues/{queueId}/localFields (не пагинируется)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { GetQueueLocalFieldsDto } from '#tracker_api/dto/index.js';
import type { QueueLocalFieldWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export class GetQueueLocalFieldsOperation extends BaseOperation {
  async execute(
    dto: GetQueueLocalFieldsDto
  ): Promise<PaginatedResult<QueueLocalFieldWithUnknownFields>> {
    const { queueId } = dto;
    this.logger.info(`Получение локальных полей очереди: ${queueId}`);

    const response = await this.httpClient.getWithResponse<QueueLocalFieldWithUnknownFields[]>(
      `/v3/queues/${queueId}/localFields`
    );
    return TrackerPaginator.singlePage<QueueLocalFieldWithUnknownFields>(response);
  }
}
