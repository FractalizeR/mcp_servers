/**
 * Search Service — сервис полнотекстового поиска по Wiki (пакет 7.2.C).
 *
 * Ответственность:
 * - Делегирование запроса поиска соответствующей операции
 *
 * Архитектура: прямая инъекция операции (как RawApiService/ResourceService) —
 * домен из одной операции не заводит отдельный OperationsContainer.
 */

import { injectable, inject } from 'inversify';
import { SearchOperation } from '#wiki_api/api_operations/index.js';
import type { SearchDto } from '#wiki_api/dto/index.js';
import type { SearchResponse } from '#wiki_api/entities/index.js';

@injectable()
export class SearchService {
  constructor(@inject(SearchOperation) private readonly searchOp: SearchOperation) {}

  async search(data: SearchDto): Promise<SearchResponse> {
    return this.searchOp.execute(data);
  }
}
