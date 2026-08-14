/**
 * Операция создания колонки доски
 *
 * API: POST /v3/boards/{boardId}/columns/
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { CreateStandaloneBoardColumnDto } from '#tracker_api/dto/index.js';
import type { BoardColumn } from '#tracker_api/entities/index.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';

export class CreateBoardColumnOperation extends BaseOperation {
  async execute(dto: CreateStandaloneBoardColumnDto): Promise<WithUnknownFields<BoardColumn>> {
    const { boardId, name, statuses } = dto;
    this.logger.info(`Создание колонки доски ${boardId}: ${name}`);

    return this.httpClient.post<WithUnknownFields<BoardColumn>>(`/v3/boards/${boardId}/columns/`, {
      name,
      statuses,
    });
  }
}
