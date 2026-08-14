import { BaseOperation } from '../base-operation.js';
import type { CommentsResponse, CommentResolveStatus } from '#wiki_api/entities/index.js';

export interface GetCommentsParams {
  idx: number;
  cursor?: string;
  order_direction?: 'asc' | 'desc';
  page_size?: number;
  status_filter?: CommentResolveStatus;
}

export class GetCommentsOperation extends BaseOperation {
  async execute(params: GetCommentsParams): Promise<CommentsResponse> {
    const queryParams: Record<string, string | number> = {};

    if (params.cursor !== undefined) queryParams['cursor'] = params.cursor;
    if (params.order_direction !== undefined)
      queryParams['order_direction'] = params.order_direction;
    if (params.page_size !== undefined) queryParams['page_size'] = params.page_size;
    if (params.status_filter !== undefined) queryParams['status_filter'] = params.status_filter;

    this.logger.info(`Getting comments for page: ${params.idx}`);

    return this.httpClient.get<CommentsResponse>(
      `/v1/pages/${params.idx}/comments`,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
  }
}
