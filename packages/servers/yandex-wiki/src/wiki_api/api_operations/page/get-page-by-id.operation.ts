import { BaseOperation } from '../base-operation.js';
import type { PageWithUnknownFields } from '#wiki_api/entities/index.js';

export interface GetPageByIdParams {
  idx: number;
  fields?: string;
  raise_on_redirect?: boolean;
  revision_id?: number;
}

export class GetPageByIdOperation extends BaseOperation {
  async execute(params: GetPageByIdParams): Promise<PageWithUnknownFields> {
    const queryParams: Record<string, string | number | boolean> = {};

    if (params.fields !== undefined) queryParams['fields'] = params.fields;
    if (params.raise_on_redirect !== undefined) queryParams['raise_on_redirect'] = true;
    if (params.revision_id !== undefined) queryParams['revision_id'] = params.revision_id;

    this.logger.info(`Getting page by id: ${params.idx}`);

    return this.httpClient.get<PageWithUnknownFields>(
      `/v1/pages/${params.idx}`,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
  }
}
