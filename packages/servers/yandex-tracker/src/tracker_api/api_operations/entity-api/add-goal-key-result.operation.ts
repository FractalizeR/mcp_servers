/**
 * Операция добавления одного Key Result к цели (append, id существующих не меняются)
 *
 * API: PATCH /v3/entities/goal/{id}?fields=keyResultItems
 * Body: { fields: { keyResultItems: { add: <item> } } }
 *
 * Форма подтверждена референсным клиентом (`Goal.add_key_result`/
 * `_update_key_results`, добавлено 2026-08-10).
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { AddGoalKeyResultDto } from '#tracker_api/dto/entity-api/index.js';
import type { KeyResultItemWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildKeyResultItemBody } from './key-result-body.util.js';

interface GoalKeyResultsResponse {
  readonly keyResultItems?: readonly KeyResultItemWithUnknownFields[];
  readonly fields?: { readonly keyResultItems?: readonly KeyResultItemWithUnknownFields[] };
}

export class AddGoalKeyResultOperation extends BaseOperation {
  async execute(dto: AddGoalKeyResultDto): Promise<readonly KeyResultItemWithUnknownFields[]> {
    const { goalId, item } = dto;
    this.logger.info(`Добавление Key Result к цели: ${goalId}`);

    const response = await this.httpClient.patch<GoalKeyResultsResponse>(
      `/v3/entities/goal/${goalId}?fields=keyResultItems`,
      { fields: { keyResultItems: { add: buildKeyResultItemBody(item) } } }
    );

    return response.fields?.keyResultItems ?? response.keyResultItems ?? [];
  }
}
