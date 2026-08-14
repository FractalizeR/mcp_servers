import { BaseOperation } from '../base-operation.js';
import type { PageWithUnknownFields } from '#wiki_api/entities/index.js';

export interface GetPageParams {
  slug: string;
  fields?: string;
  raise_on_redirect?: boolean;
  revision_id?: number;
}

export class GetPageOperation extends BaseOperation {
  async execute(params: GetPageParams): Promise<PageWithUnknownFields> {
    const queryParams: Record<string, string | number | boolean> = {
      slug: params.slug,
    };

    if (params.fields !== undefined) queryParams['fields'] = params.fields;
    // Сериализуем фактическое значение, а не факт присутствия ключа — тот же
    // класс дефекта, что и `delete-page.operation.ts` (пакет 7.2.D):
    // `raise_on_redirect: false` не должен уходить как `true`.
    if (params.raise_on_redirect !== undefined)
      queryParams['raise_on_redirect'] = params.raise_on_redirect;
    if (params.revision_id !== undefined) queryParams['revision_id'] = params.revision_id;

    this.logger.info(`Getting page by slug: ${params.slug}`);

    return this.httpClient.get<PageWithUnknownFields>('/v1/pages', queryParams);
  }
}
