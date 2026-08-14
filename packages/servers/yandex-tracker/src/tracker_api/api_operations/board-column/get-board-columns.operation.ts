/**
 * Операция получения списка колонок доски
 *
 * API: GET /v3/boards/{boardId}/columns (не пагинируется)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { GetBoardColumnsDto } from '#tracker_api/dto/index.js';
import type { BoardColumn } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';

export class GetBoardColumnsOperation extends BaseOperation {
  async execute(dto: GetBoardColumnsDto): Promise<PaginatedResult<WithUnknownFields<BoardColumn>>> {
    const { boardId } = dto;
    this.logger.info(`Получение колонок доски: ${boardId}`);

    const response = await this.httpClient.getWithResponse<WithUnknownFields<BoardColumn>[]>(
      `/v3/boards/${boardId}/columns`
    );
    return TrackerPaginator.singlePage<WithUnknownFields<BoardColumn>>(response);
  }
}
