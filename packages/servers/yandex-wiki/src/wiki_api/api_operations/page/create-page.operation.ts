import { BaseOperation } from '../base-operation.js';
import type { CreatePageDto } from '#wiki_api/dto/index.js';
import type { PageWithUnknownFields } from '#wiki_api/entities/index.js';

export interface CreatePageParams {
  data: CreatePageDto;
  fields?: string;
  is_silent?: boolean;
}

export class CreatePageOperation extends BaseOperation {
  async execute(params: CreatePageParams): Promise<PageWithUnknownFields> {
    const queryParts: string[] = [];

    if (params.fields !== undefined) queryParts.push(`fields=${encodeURIComponent(params.fields)}`);
    // Сериализуем фактическое значение, а не факт присутствия ключа — тот же
    // класс дефекта, что и `delete-page.operation.ts` (пакет 7.2.D):
    // `is_silent: false` не должен уходить как `is_silent=true`.
    if (params.is_silent !== undefined) queryParts.push(`is_silent=${params.is_silent}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    this.logger.info(`Creating page: ${params.data.slug}`);

    return this.httpClient.post<PageWithUnknownFields>(`/v1/pages${queryString}`, params.data);
  }
}
