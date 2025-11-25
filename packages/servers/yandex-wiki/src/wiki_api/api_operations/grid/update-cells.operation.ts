import { BaseOperation } from '../base-operation.js';
import type { UpdateCellsDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class UpdateCellsOperation extends BaseOperation {
  async execute(idx: string, data: UpdateCellsDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Updating cells in grid: ${idx}`);

    return this.httpClient.post<GridWithUnknownFields>(`/v1/grids/${idx}/cells`, data);
  }
}
