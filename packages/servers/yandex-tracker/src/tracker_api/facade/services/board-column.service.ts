/**
 * Board Column Service - сервис для работы с колонками доски
 *
 * Ответственность:
 * - Список колонок доски, создание, обновление, удаление
 *
 * Архитектура: прямая инъекция операций через декораторы, без зависимостей
 * от других сервисов.
 */

import { injectable, inject } from 'inversify';
import {
  GetBoardColumnsOperation,
  CreateBoardColumnOperation,
  UpdateBoardColumnOperation,
  DeleteBoardColumnOperation,
} from '#tracker_api/api_operations/board-column/index.js';
import type {
  GetBoardColumnsDto,
  CreateStandaloneBoardColumnDto,
  UpdateBoardColumnDto,
  DeleteBoardColumnDto,
} from '#tracker_api/dto/index.js';
import type { BoardColumn, PaginatedResult } from '#tracker_api/entities/index.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';

@injectable()
export class BoardColumnService {
  constructor(
    @inject(GetBoardColumnsOperation) private readonly getColumnsOp: GetBoardColumnsOperation,
    @inject(CreateBoardColumnOperation)
    private readonly createColumnOp: CreateBoardColumnOperation,
    @inject(UpdateBoardColumnOperation)
    private readonly updateColumnOp: UpdateBoardColumnOperation,
    @inject(DeleteBoardColumnOperation)
    private readonly deleteColumnOp: DeleteBoardColumnOperation
  ) {}

  async getBoardColumns(
    dto: GetBoardColumnsDto
  ): Promise<PaginatedResult<WithUnknownFields<BoardColumn>>> {
    return this.getColumnsOp.execute(dto);
  }

  async createBoardColumn(
    dto: CreateStandaloneBoardColumnDto
  ): Promise<WithUnknownFields<BoardColumn>> {
    return this.createColumnOp.execute(dto);
  }

  async updateBoardColumn(dto: UpdateBoardColumnDto): Promise<WithUnknownFields<BoardColumn>> {
    return this.updateColumnOp.execute(dto);
  }

  async deleteBoardColumn(dto: DeleteBoardColumnDto): Promise<void> {
    return this.deleteColumnOp.execute(dto);
  }
}
