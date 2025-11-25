import { BaseOperation } from '../base-operation.js';
import type { CreatePageDto } from '#wiki_api/dto/index.js';
import type { PageWithUnknownFields } from '#wiki_api/entities/index.js';

export interface CreatePageParams {
  data: CreatePageDto;
  fields?: string;
  is_silent?: boolean;
}

export class CreatePageOperation extends BaseOperation {
  async execute(params: CreatePageParams): Promise<PageWithUnknownFields> {
    this.logger.info(`Creating page: ${params.data.slug}`);

    // Note: fields and is_silent query params are not supported by basic httpClient.post
    // For full implementation, extend httpClient or add query params to URL
    return this.httpClient.post<PageWithUnknownFields>('/v1/pages', params.data);
  }
}
