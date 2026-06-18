/**
 * Операция получения списка компонентов очереди
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка компонентов конкретной очереди
 * - НЕТ создания/обновления/удаления компонентов
 *
 * API: GET /v2/queues/{queueId}/components
 *
 * ВАЖНО:
 * - Компоненты привязаны к очереди и всегда запрашиваются в контексте очереди
 * - По наблюдению API компонентов НЕ пагинирует (Link rel="next" отсутствует),
 *   поэтому `fetchAll` фактически делает один запрос. Тем не менее операция
 *   возвращает `PaginatedResult` для единообразия контракта list-операций.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType, type QueryParams } from '@fractalizer/mcp-infrastructure';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
} from '#tracker_api/utils/tracker-paginator.util.js';
import type { ComponentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';
import type { GetComponentsInput } from '#tracker_api/dto/component/get-components.dto.js';

export class GetComponentsOperation extends BaseOperation {
  /**
   * Получает список компонентов очереди.
   *
   * Кеширование:
   * - Базовый запрос (без пагинационных параметров) кешируется по ключу очереди.
   * - При заданных `page`/`perPage`/`fetchAll`/`maxItems` кеш НЕ используется:
   *   иначе разные срезы пагинации возвращали бы один закешированный ответ (баг).
   *
   * @param input - очередь + опциональные параметры пагинации
   * @returns `PaginatedResult` с компонентами и метаданными пагинации
   */
  async execute(input: GetComponentsInput): Promise<PaginatedResult<ComponentWithUnknownFields>> {
    const { queueId } = input;
    this.logger.info(`Получение компонентов очереди ${queueId}`);

    const hasPaginationParams =
      input.page !== undefined ||
      input.perPage !== undefined ||
      input.fetchAll !== undefined ||
      input.maxItems !== undefined;

    // Кеш применяем только к «базовому» запросу без пагинационных параметров,
    // чтобы разные срезы не схлопывались в один закешированный ответ.
    if (!hasPaginationParams) {
      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, `${queueId}/components`);
      const cached =
        await this.cacheManager.get<PaginatedResult<ComponentWithUnknownFields>>(cacheKey);

      if (cached) {
        this.logger.debug(`Компоненты очереди ${queueId} получены из кеша`);
        return cached;
      }

      const result = await this.fetch(input);
      await this.cacheManager.set(cacheKey, result);

      this.logger.info(`Получено ${result.items.length} компонентов для очереди ${queueId}`);
      return result;
    }

    const result = await this.fetch(input);
    this.logger.info(`Получено ${result.items.length} компонентов для очереди ${queueId}`);
    return result;
  }

  /**
   * Выполняет HTTP-запрос(ы) и собирает `PaginatedResult`.
   */
  private async fetch(
    input: GetComponentsInput
  ): Promise<PaginatedResult<ComponentWithUnknownFields>> {
    const fetchAll = input.fetchAll === true;
    // В режиме fetchAll поднимаем perPage к рекомендуемому максимуму ради
    // меньшего числа round-trip'ов (maxItems всё равно режет финальную выдачу).
    const effectivePerPage = fetchAll ? (input.perPage ?? DEFAULT_MAX_PER_PAGE) : input.perPage;

    const path = `/v2/queues/${input.queueId}/components`;
    const params = this.buildParams(input.page, effectivePerPage);

    const first = await this.httpClient.getWithResponse<ComponentWithUnknownFields[]>(path, params);

    if (fetchAll) {
      return TrackerPaginator.fetchAllPages<ComponentWithUnknownFields>({
        firstResponse: first,
        requestNext: (p) => this.httpClient.getWithResponse<ComponentWithUnknownFields[]>(p),
        ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
        ...(input.page !== undefined ? { page: input.page } : {}),
        ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
        onError: (error, pagesFetched) =>
          this.logger.warn(
            `Частичный отказ при обходе компонентов очереди ${input.queueId} ` +
              `после ${pagesFetched} стр.: ${String(error)}`
          ),
      });
    }

    return TrackerPaginator.singlePage<ComponentWithUnknownFields>(first, {
      page: input.page,
      perPage: input.perPage,
    });
  }

  /**
   * Собирает query-параметры запроса (только заданные значения).
   */
  private buildParams(page?: number, perPage?: number): QueryParams | undefined {
    const params: QueryParams = {};
    if (page !== undefined) {
      params['page'] = page;
    }
    if (perPage !== undefined) {
      params['perPage'] = perPage;
    }
    return Object.keys(params).length > 0 ? params : undefined;
  }
}
