import { BaseOperation } from '../base-operation.js';
import type { RemoveColumnsDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class RemoveColumnsOperation extends BaseOperation {
  async execute(idx: string, data: RemoveColumnsDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Removing columns from grid: ${idx}`);

    // DELETE with body
    return this.httpClient.delete<GridWithUnknownFields>(`/v1/grids/${idx}/columns`, data);
  }
}
