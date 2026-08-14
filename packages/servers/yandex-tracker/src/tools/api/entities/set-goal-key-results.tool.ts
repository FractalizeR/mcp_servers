/**
 * MCP Tool для полной замены списка Key Results цели
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { SetGoalKeyResultsParamsSchema } from './set-goal-key-results.schema.js';

import { SET_GOAL_KEY_RESULTS_TOOL_METADATA } from './set-goal-key-results.metadata.js';

export class SetGoalKeyResultsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = SET_GOAL_KEY_RESULTS_TOOL_METADATA;

  protected override getParamsSchema(): typeof SetGoalKeyResultsParamsSchema {
    return SetGoalKeyResultsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, SetGoalKeyResultsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { goalId, items } = validation.data;

    try {
      this.logger.info('Замена списка Key Results цели', { goalId, count: items.length });

      const keyResults = await this.facade.setGoalKeyResults({ goalId, items });

      return this.formatSuccess({
        goalId,
        keyResults,
        count: keyResults.length,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при замене Key Results цели ${goalId}`, error);
    }
  }
}
