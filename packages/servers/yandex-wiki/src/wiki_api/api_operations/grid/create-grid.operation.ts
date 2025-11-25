import { BaseOperation } from '../base-operation.js';
import type { CreateGridDto } from '#wiki_api/dto/index.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export class CreateGridOperation extends BaseOperation {
  async execute(data: CreateGridDto): Promise<GridWithUnknownFields> {
    this.logger.info(`Creating grid: ${data.title}`);

    return this.httpClient.post<GridWithUnknownFields>('/v1/grids', data);
  }
}
