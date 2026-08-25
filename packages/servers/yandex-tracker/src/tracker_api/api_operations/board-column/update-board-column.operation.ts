/**
 * Операция обновления колонки доски
 *
 * API: PATCH /v3/boards/{boardId}/columns/{columnId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ensureColumnAddressable } from './board-column-addressing.util.js';
import type { UpdateBoardColumnDto } from '#tracker_api/dto/index.js';
import type { BoardColumn } from '#tracker_api/entities/index.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';

export class UpdateBoardColumnOperation extends BaseOperation {
  async execute(dto: UpdateBoardColumnDto): Promise<WithUnknownFields<BoardColumn>> {
    const { boardId, columnId, name, statuses, limit } = dto;
    this.logger.info(`Обновление колонки доски ${boardId}: ${columnId}`);

    // `id` колонки не уникален внутри доски — см. `board-column-addressing.util.ts`.
    // Лишний GET на каждую правку осознан: альтернатива уже испортила чужую
    // колонку на боевой доске.
    await ensureColumnAddressable(this.httpClient, boardId, columnId);

    const body: Record<string, unknown> = {
      ...(name !== undefined ? { name } : {}),
      ...(statuses !== undefined ? { statuses } : {}),
      ...(limit !== undefined ? { limit } : {}),
    };

    return this.httpClient.patch<WithUnknownFields<BoardColumn>>(
      `/v3/boards/${boardId}/columns/${columnId}`,
      body
    );
  }
}
