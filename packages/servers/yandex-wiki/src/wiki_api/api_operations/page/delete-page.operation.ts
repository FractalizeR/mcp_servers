import { BaseOperation } from '../base-operation.js';

export interface DeletePageResult {
  recovery_token: string;
}

export interface DeletePageParams {
  idx: number;
  /** Удалить страницу вместе с дочерними (query-параметр Wiki API) */
  allow_recursive?: boolean;
  /** Рекурсивное удаление (query-параметр Wiki API) */
  recursive?: boolean;
}

export class DeletePageOperation extends BaseOperation {
  async execute(params: DeletePageParams): Promise<DeletePageResult> {
    const queryParts: string[] = [];

    if (params.allow_recursive !== undefined) queryParts.push('allow_recursive=true');
    if (params.recursive !== undefined) queryParts.push('recursive=true');

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    this.logger.info(`Deleting page: ${params.idx}`);

    return this.deleteRequest<DeletePageResult>(`/v1/pages/${params.idx}${queryString}`);
  }
}
