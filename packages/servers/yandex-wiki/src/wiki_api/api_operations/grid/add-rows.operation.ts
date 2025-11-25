import { BaseOperation } from '../base-operation.js';
import type { AddRowsDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class AddRowsOperation extends BaseOperation {
  async execute(idx: string, data: AddRowsDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Adding rows to grid: ${idx}`);

    return this.httpClient.post<GridWithUnknownFields>(`/v1/grids/${idx}/rows`, data);
  }
}
