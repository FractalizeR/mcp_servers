import { BaseOperation } from '../base-operation.js';
import type { AppendContentDto } from '#wiki_api/dto/index.js';
import type { PageWithUnknownFields } from '#wiki_api/entities/index.js';

export interface AppendContentParams {
  idx: number;
  data: AppendContentDto;
  fields?: string;
  is_silent?: boolean;
}

export class AppendContentOperation extends BaseOperation {
  async execute(params: AppendContentParams): Promise<PageWithUnknownFields> {
    const queryParts: string[] = [];

    if (params.fields !== undefined) queryParts.push(`fields=${encodeURIComponent(params.fields)}`);
    if (params.is_silent !== undefined) queryParts.push('is_silent=true');

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    this.logger.info(`Appending content to page: ${params.idx}`);

    return this.httpClient.post<PageWithUnknownFields>(
      `/v1/pages/${params.idx}/append-content${queryString}`,
      params.data
    );
  }
}
