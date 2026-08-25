/**
 * Операция получения списка компонентов очереди
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка компонентов конкретной очереди
 * - НЕТ создания/обновления/удаления компонентов
 *
 * API: GET /v3/queues/{queueId}/components
 *
 * ВАЖНО:
 * - Компоненты привязаны к очереди и всегда запрашиваются в её контексте.
 * - API компонентов НЕ пагинирует (Link rel="next" отсутствует): возвращает
 *   все компоненты очереди одним ответом. Операция делает один запрос и
 *   оборачивает результат в `PaginatedResult` для единообразия контракта
 *   list-операций (`pagination.hasNextPage=false`).
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { ComponentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';
import type { GetComponentsInput } from '#tracker_api/dto/component/get-components.dto.js';

export class GetComponentsOperation extends BaseOperation {
  /**
   * Получает список компонентов очереди (один запрос, без пагинации).
   *
   * Кеширование: результат кешируется по ключу очереди — у эндпоинта нет
   * пагинационных срезов, поэтому кеш безопасен для любого вызова.
   *
   * @param input - очередь
   * @returns `PaginatedResult` с компонентами (single-page)
   */
  async execute(input: GetComponentsInput): Promise<PaginatedResult<ComponentWithUnknownFields>> {
    const { queueId } = input;
    this.logger.info(`Получение компонентов очереди ${queueId}`);

    const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, `${queueId}/components`);
    const cached =
      await this.cacheManager.get<PaginatedResult<ComponentWithUnknownFields>>(cacheKey);

    if (cached) {
      this.logger.debug(`Компоненты очереди ${queueId} получены из кеша`);
      return cached;
    }

    const result = await this.fetch(queueId);
    await this.cacheManager.set(cacheKey, result);

    this.logger.info(`Получено ${result.items.length} компонентов для очереди ${queueId}`);
    return result;
  }

  /**
   * Выполняет один HTTP-запрос и оборачивает ответ в `PaginatedResult`.
   */
  private async fetch(queueId: string): Promise<PaginatedResult<ComponentWithUnknownFields>> {
    const path = `/v3/queues/${queueId}/components`;
    const response = await this.httpClient.getWithResponse<ComponentWithUnknownFields[]>(path);
    return TrackerPaginator.singlePage<ComponentWithUnknownFields>(response);
  }
}
