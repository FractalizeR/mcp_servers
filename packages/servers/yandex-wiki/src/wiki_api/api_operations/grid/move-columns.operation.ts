import { BaseOperation } from '../base-operation.js';
import type { MoveColumnDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class MoveColumnsOperation extends BaseOperation {
  async execute(idx: string, data: MoveColumnDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Moving columns in grid: ${idx}`);

    return this.httpClient.post<GridWithUnknownFields>(`/v1/grids/${idx}/columns/move`, data);
  }
}
