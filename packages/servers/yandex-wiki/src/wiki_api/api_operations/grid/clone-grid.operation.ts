import { BaseOperation } from '../base-operation.js';
import type { CloneGridDto } from '#wiki_api/dto/index.js';
import type { AsyncOperation } from '#wiki_api/entities/index.js';

export class CloneGridOperation extends BaseOperation {
  async execute(idx: string, data: CloneGridDto): Promise<AsyncOperation> {
    this.logger.info(`Cloning grid ${idx} to ${data.target}`);

    return this.httpClient.post<AsyncOperation>(`/v1/grids/${idx}/clone`, data);
  }
}
