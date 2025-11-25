import { BaseOperation } from '../base-operation.js';
import type { ClonePageDto } from '#wiki_api/dto/index.js';
import type { AsyncOperation } from '#wiki_api/entities/index.js';

export class ClonePageOperation extends BaseOperation {
  async execute(idx: number, data: ClonePageDto): Promise<AsyncOperation> {
    this.logger.info(`Cloning page ${idx} to ${data.target}`);

    return this.httpClient.post<AsyncOperation>(`/v1/pages/${idx}/clone`, data);
  }
}
