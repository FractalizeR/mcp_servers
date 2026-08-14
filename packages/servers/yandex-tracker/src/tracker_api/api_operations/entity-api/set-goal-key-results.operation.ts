/**
 * Операция полной замены списка Key Results цели.
 *
 * ВАЖНО: заменяет весь список целиком — API перегенерирует id всех
 * элементов (даже не изменившихся). Чтобы удалить один key result, передайте
 * список без него (полученный, например, из `get_goal_key_results`).
 *
 * API: PATCH /v3/entities/goal/{id}?fields=keyResultItems
 * Body: { fields: { keyResultItems: [<item>, ...] } }
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { SetGoalKeyResultsDto } from '#tracker_api/dto/entity-api/index.js';
import type { KeyResultItemWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildKeyResultItemBody } from './key-result-body.util.js';

interface GoalKeyResultsResponse {
  readonly keyResultItems?: readonly KeyResultItemWithUnknownFields[];
  readonly fields?: { readonly keyResultItems?: readonly KeyResultItemWithUnknownFields[] };
}

export class SetGoalKeyResultsOperation extends BaseOperation {
  async execute(dto: SetGoalKeyResultsDto): Promise<readonly KeyResultItemWithUnknownFields[]> {
    const { goalId, items } = dto;
    this.logger.info(`Замена списка Key Results цели: ${goalId}`, { count: items.length });

    const response = await this.httpClient.patch<GoalKeyResultsResponse>(
      `/v3/entities/goal/${goalId}?fields=keyResultItems`,
      { fields: { keyResultItems: items.map(buildKeyResultItemBody) } }
    );

    return response.fields?.keyResultItems ?? response.keyResultItems ?? [];
  }
}
