import { BaseOperation } from '../base-operation.js';
import type { CommentsResponse } from '#wiki_api/entities/index.js';

export interface GetCommentThreadParams {
  idx: number;
  comment_id: number;
  cursor?: string;
  page_size?: number;
}

export class GetCommentThreadOperation extends BaseOperation {
  async execute(params: GetCommentThreadParams): Promise<CommentsResponse> {
    const queryParams: Record<string, string | number> = {};

    if (params.cursor !== undefined) queryParams['cursor'] = params.cursor;
    if (params.page_size !== undefined) queryParams['page_size'] = params.page_size;

    this.logger.info(`Getting comment thread ${params.comment_id} on page: ${params.idx}`);

    return this.httpClient.get<CommentsResponse>(
      `/v1/pages/${params.idx}/comments/${params.comment_id}/thread`,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
  }
}
