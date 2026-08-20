/**
 * Операция получения списка сохранённых фильтров текущего пользователя
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка фильтров
 * - НЕТ создания/обновления
 *
 * API: GET /v3/myself/favorites/filters — это и есть list-эндпоинт (в
 * референсном клиенте `Filters.get_favorites()`, yandex_tracker_client/
 * collections.py). Общий для коллекций паттерн «GET на базовый путь без id»
 * здесь НЕ работает: `/v3/filters` принимает только POST (создание) и на GET
 * отвечает 405 — прежняя реализация падала всегда, поймано живой пробой.
 * Не пагинируется (личный набор фильтров невелик, аналогично get_components).
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { SavedFilterWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export class GetFiltersOperation extends BaseOperation {
  async execute(): Promise<PaginatedResult<SavedFilterWithUnknownFields>> {
    this.logger.info('Получение списка сохранённых фильтров');

    const response = await this.httpClient.getWithResponse<SavedFilterWithUnknownFields[]>(
      '/v3/myself/favorites/filters'
    );
    return TrackerPaginator.singlePage<SavedFilterWithUnknownFields>(response);
  }
}
