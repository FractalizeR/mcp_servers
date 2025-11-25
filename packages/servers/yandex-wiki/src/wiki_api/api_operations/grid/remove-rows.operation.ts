import { BaseOperation } from '../base-operation.js';
import type { RemoveRowsDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class RemoveRowsOperation extends BaseOperation {
  async execute(idx: string, data: RemoveRowsDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Removing rows from grid: ${idx}`);

    // DELETE with body - need to use httpClient appropriately
    return this.httpClient.delete<GridWithUnknownFields>(`/v1/grids/${idx}/rows`, data);
  }
}
