/**
 * Операция получения списка сохранённых фильтров текущего пользователя
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка фильтров
 * - НЕТ создания/обновления
 *
 * API: GET /v3/filters (список личных фильтров — официальная документация
 * НЕ описывает отдельный list-эндпоинт, см. отчёт задачи; используется
 * общий механизм референсного клиента `Collection.get_all()`, т.е. GET на
 * базовый путь коллекции без id — тот же паттерн, что и для queues/boards).
 * Не пагинируется (личный набор фильтров невелик, аналогично get_components).
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { SavedFilterWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export class GetFiltersOperation extends BaseOperation {
  async execute(): Promise<PaginatedResult<SavedFilterWithUnknownFields>> {
    this.logger.info('Получение списка сохранённых фильтров');

    const response =
      await this.httpClient.getWithResponse<SavedFilterWithUnknownFields[]>('/v3/filters');
    return TrackerPaginator.singlePage<SavedFilterWithUnknownFields>(response);
  }
}
