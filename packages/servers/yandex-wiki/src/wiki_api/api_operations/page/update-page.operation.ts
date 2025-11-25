import { BaseOperation } from '../base-operation.js';
import type { UpdatePageDto } from '#wiki_api/dto/index.js';
import type { PageWithUnknownFields } from '#wiki_api/entities/index.js';

export interface UpdatePageParams {
  idx: number;
  data: UpdatePageDto;
  allow_merge?: boolean;
  fields?: string;
  is_silent?: boolean;
}

export class UpdatePageOperation extends BaseOperation {
  async execute(params: UpdatePageParams): Promise<PageWithUnknownFields> {
    const queryParts: string[] = [];

    if (params.allow_merge !== undefined) queryParts.push('allow_merge=true');
    if (params.fields !== undefined) queryParts.push(`fields=${encodeURIComponent(params.fields)}`);
    if (params.is_silent !== undefined) queryParts.push('is_silent=true');

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    this.logger.info(`Updating page: ${params.idx}`);

    // Wiki API uses POST for update
    return this.httpClient.post<PageWithUnknownFields>(
      `/v1/pages/${params.idx}${queryString}`,
      params.data
    );
  }
}
