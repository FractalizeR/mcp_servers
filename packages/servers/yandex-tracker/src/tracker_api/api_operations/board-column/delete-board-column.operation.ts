/**
 * Операция удаления колонки доски
 *
 * API: DELETE /v3/boards/{boardId}/columns/{columnId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ensureColumnAddressable } from './board-column-addressing.util.js';
import type { DeleteBoardColumnDto } from '#tracker_api/dto/index.js';

export class DeleteBoardColumnOperation extends BaseOperation {
  async execute(dto: DeleteBoardColumnDto): Promise<void> {
    const { boardId, columnId } = dto;
    this.logger.info(`Удаление колонки доски ${boardId}: ${columnId}`);

    // `id` колонки не уникален внутри доски — см. `board-column-addressing.util.ts`.
    // На боевой доске DELETE по неоднозначному id снёс сразу обе колонки.
    await ensureColumnAddressable(this.httpClient, boardId, columnId);

    await this.httpClient.delete<void>(`/v3/boards/${boardId}/columns/${columnId}`);
  }
}
