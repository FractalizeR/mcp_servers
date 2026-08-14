import { BaseOperation } from '../base-operation.js';
import type { SearchDto } from '#wiki_api/dto/index.js';
import type { SearchResponse } from '#wiki_api/entities/index.js';

export class SearchOperation extends BaseOperation {
  /**
   * `POST /v1/search` — единственный способ найти страницу без знания
   * точного slug/id (пакет 7.2.C). Метод POST, но операция читающая —
   * `idempotencyDeclared: true` третьим аргументом `post()` разрешает
   * транспорту повторять запрос при сетевом сбое (см. JSDoc
   * `IHttpClient.post` про политику retry для POST по умолчанию).
   */
  async execute(data: SearchDto): Promise<SearchResponse> {
    this.logger.info(`Searching wiki: ${data.query}`);

    return this.httpClient.post<SearchResponse>('/v1/search', data, true);
  }
}
