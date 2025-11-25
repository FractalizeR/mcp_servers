import { BaseOperation } from '../base-operation.js';
import type { UpdateGridDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class UpdateGridOperation extends BaseOperation {
  async execute(idx: string, data: UpdateGridDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Updating grid: ${idx}`);

    return this.httpClient.post<GridWithUnknownFields>(`/v1/grids/${idx}`, data);
  }
}
