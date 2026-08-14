/**
 * Операция получения Key Results цели (Goal.keyResultItems)
 *
 * API: GET /v3/entities/goal/{id}?fields=keyResultItems
 *
 * ВАЖНО: `keyResultItems` — "ленивое" поле, не отдаётся в обычном GET/поиске
 * без явного `fields=keyResultItems` (см. референсный клиент,
 * `Goal.key_results`).
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { GetGoalKeyResultsDto } from '#tracker_api/dto/entity-api/index.js';
import type { KeyResultItemWithUnknownFields } from '#tracker_api/entities/index.js';

interface GoalKeyResultsResponse {
  readonly keyResultItems?: readonly KeyResultItemWithUnknownFields[];
  readonly fields?: { readonly keyResultItems?: readonly KeyResultItemWithUnknownFields[] };
}

export class GetGoalKeyResultsOperation extends BaseOperation {
  async execute(dto: GetGoalKeyResultsDto): Promise<readonly KeyResultItemWithUnknownFields[]> {
    const { goalId } = dto;
    this.logger.info(`Получение Key Results цели: ${goalId}`);

    const response = await this.httpClient.get<GoalKeyResultsResponse>(
      `/v3/entities/goal/${goalId}?fields=keyResultItems`
    );

    return response.fields?.keyResultItems ?? response.keyResultItems ?? [];
  }
}
