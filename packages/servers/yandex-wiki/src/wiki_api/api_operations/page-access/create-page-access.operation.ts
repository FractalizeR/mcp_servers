import { BaseOperation } from '../base-operation.js';
import type { CreatePageAccessDto } from '#wiki_api/dto/index.js';
import type { PageAccess } from '#wiki_api/entities/index.js';

export class CreatePageAccessOperation extends BaseOperation {
  async execute(idx: number, data: CreatePageAccessDto): Promise<PageAccess> {
    this.logger.info(`Adding page access on page: ${idx}`);

    return this.httpClient.post<PageAccess>(`/v1/pages/${idx}/access`, data);
  }
}
