/**
 * MCP Tool для получения Key Results (OKR-метрик) цели
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { KeyResultItemWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetGoalKeyResultsParamsSchema } from './get-goal-key-results.schema.js';

import { GET_GOAL_KEY_RESULTS_TOOL_METADATA } from './get-goal-key-results.metadata.js';

export class GetGoalKeyResultsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_GOAL_KEY_RESULTS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetGoalKeyResultsParamsSchema {
    return GetGoalKeyResultsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetGoalKeyResultsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { goalId, fields } = validation.data;

    try {
      this.logger.info('Получение Key Results цели', { goalId });

      const keyResults = await this.facade.getGoalKeyResults({ goalId });

      const { result: filtered, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        readonly KeyResultItemWithUnknownFields[]
      >(keyResults, fields);

      return this.formatSuccess(
        {
          goalId,
          keyResults: filtered,
          count: filtered.length,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении Key Results цели ${goalId}`, error);
    }
  }
}
