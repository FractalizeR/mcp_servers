import { BaseOperation } from '../base-operation.js';
import type { AddColumnsDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class AddColumnsOperation extends BaseOperation {
  async execute(idx: string, data: AddColumnsDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Adding columns to grid: ${idx}`);

    return this.httpClient.post<GridWithUnknownFields>(`/v1/grids/${idx}/columns`, data);
  }
}
