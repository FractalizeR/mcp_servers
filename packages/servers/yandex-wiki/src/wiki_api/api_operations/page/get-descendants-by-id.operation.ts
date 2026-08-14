import { BaseOperation } from '../base-operation.js';
import type { PageDescendantsResponse } from '#wiki_api/entities/index.js';

export interface GetDescendantsByIdParams {
  idx: number;
  /** Фильтр по актуальности: 'actual' | 'obsolete' */
  actuality?: 'actual' | 'obsolete';
  /** Курсор пагинации */
  cursor?: string;
  /** Включить саму страницу в результат (default: false) */
  include_self?: boolean;
  /** Размер страницы (default: 50, max: 100) */
  page_size?: number;
  show_all?: boolean;
}

export class GetDescendantsByIdOperation extends BaseOperation {
  async execute(params: GetDescendantsByIdParams): Promise<PageDescendantsResponse> {
    const queryParams: Record<string, string | number | boolean> = {};

    if (params.actuality !== undefined) queryParams['actuality'] = params.actuality;
    if (params.cursor !== undefined) queryParams['cursor'] = params.cursor;
    if (params.include_self !== undefined) queryParams['include_self'] = params.include_self;
    if (params.page_size !== undefined) queryParams['page_size'] = params.page_size;
    if (params.show_all !== undefined) queryParams['show_all'] = params.show_all;

    this.logger.info(`Getting descendants for page id: ${params.idx}`);

    return this.httpClient.get<PageDescendantsResponse>(
      `/v1/pages/${params.idx}/descendants`,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
  }
}
