import { BaseOperation } from '../base-operation.js';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

export interface GetGridParams {
  /** Grid ID (UUID) */
  idx: string;
  /** Fields to return */
  fields?: string;
  /** Filter expression */
  filter?: string;
  /** Only specific columns */
  only_cols?: string;
  /** Only specific rows */
  only_rows?: string;
  /** Sort configuration */
  sort?: string;
}

export class GetGridOperation extends BaseOperation {
  async execute(params: GetGridParams): Promise<GridWithUnknownFields> {
    const queryParams: Record<string, string> = {};

    if (params.fields !== undefined) queryParams['fields'] = params.fields;
    if (params.filter !== undefined) queryParams['filter'] = params.filter;
    if (params.only_cols !== undefined) queryParams['only_cols'] = params.only_cols;
    if (params.only_rows !== undefined) queryParams['only_rows'] = params.only_rows;
    if (params.sort !== undefined) queryParams['sort'] = params.sort;

    this.logger.info(`Getting grid: ${params.idx}`);

    return this.httpClient.get<GridWithUnknownFields>(`/v1/grids/${params.idx}`, queryParams);
  }
}
