import { BaseOperation } from '../base-operation.js';
import type { ResourcesResponse, ResourceType } from '#wiki_api/entities/index.js';

export interface GetResourcesParams {
  /** Page ID (integer) */
  idx: number;
  /** Cursor for pagination */
  cursor?: string;
  /** Sort field: name_title, created_at */
  order_by?: 'name_title' | 'created_at';
  /** Sort direction */
  order_direction?: 'asc' | 'desc';
  /** Page number (default: 1) */
  page_id?: number;
  /** Page size (default: 25, max: 50) */
  page_size?: number;
  /** Search query */
  q?: string;
  /** Resource types filter */
  types?: ResourceType[];
}

export class GetResourcesOperation extends BaseOperation {
  async execute(params: GetResourcesParams): Promise<ResourcesResponse> {
    const queryParams: Record<string, string | number> = {};

    if (params.cursor !== undefined) queryParams['cursor'] = params.cursor;
    if (params.order_by !== undefined) queryParams['order_by'] = params.order_by;
    if (params.order_direction !== undefined)
      queryParams['order_direction'] = params.order_direction;
    if (params.page_id !== undefined) queryParams['page_id'] = params.page_id;
    if (params.page_size !== undefined) queryParams['page_size'] = params.page_size;
    if (params.q !== undefined) queryParams['q'] = params.q;
    if (params.types !== undefined && params.types.length > 0) {
      queryParams['types'] = params.types.join(',');
    }

    this.logger.info(`Getting resources for page: ${params.idx}`);

    return this.httpClient.get<ResourcesResponse>(`/v1/pages/${params.idx}/resources`, queryParams);
  }
}
