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

    // Сериализуем фактическое значение, а не факт присутствия ключа — тот же
    // класс дефекта, что и `delete-page.operation.ts` (пакет 7.2.D):
    // `allow_merge`/`is_silent: false` не должны уходить как `=true`.
    if (params.allow_merge !== undefined) queryParts.push(`allow_merge=${params.allow_merge}`);
    if (params.fields !== undefined) queryParts.push(`fields=${encodeURIComponent(params.fields)}`);
    if (params.is_silent !== undefined) queryParts.push(`is_silent=${params.is_silent}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    this.logger.info(`Updating page: ${params.idx}`);

    // Wiki API uses POST for update
    return this.httpClient.post<PageWithUnknownFields>(
      `/v1/pages/${params.idx}${queryString}`,
      params.data
    );
  }
}
