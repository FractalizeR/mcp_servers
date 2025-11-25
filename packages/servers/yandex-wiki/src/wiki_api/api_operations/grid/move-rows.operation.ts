import { BaseOperation } from '../base-operation.js';
import type { MoveRowDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class MoveRowsOperation extends BaseOperation {
  async execute(idx: string, data: MoveRowDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Moving rows in grid: ${idx}`);

    return this.httpClient.post<GridWithUnknownFields>(`/v1/grids/${idx}/rows/move`, data);
  }
}
