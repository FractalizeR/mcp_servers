/**
 * Операция очистки всех Key Results цели (keyResultItems = null).
 *
 * API: PATCH /v3/entities/goal/{id}?fields=keyResultItems
 * Body: { fields: { keyResultItems: null } }
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { ClearGoalKeyResultsDto } from '#tracker_api/dto/entity-api/index.js';

export class ClearGoalKeyResultsOperation extends BaseOperation {
  async execute(dto: ClearGoalKeyResultsDto): Promise<void> {
    const { goalId } = dto;
    this.logger.info(`Очистка Key Results цели: ${goalId}`);

    await this.httpClient.patch(`/v3/entities/goal/${goalId}?fields=keyResultItems`, {
      fields: { keyResultItems: null },
    });
  }
}
