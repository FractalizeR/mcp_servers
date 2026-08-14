/**
 * MCP Tool для очистки всех Key Results цели
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ClearGoalKeyResultsParamsSchema } from './clear-goal-key-results.schema.js';

import { CLEAR_GOAL_KEY_RESULTS_TOOL_METADATA } from './clear-goal-key-results.metadata.js';

export class ClearGoalKeyResultsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CLEAR_GOAL_KEY_RESULTS_TOOL_METADATA;

  protected override getParamsSchema(): typeof ClearGoalKeyResultsParamsSchema {
    return ClearGoalKeyResultsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, ClearGoalKeyResultsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { goalId } = validation.data;

    try {
      this.logger.info('Очистка Key Results цели', { goalId });

      await this.facade.clearGoalKeyResults({ goalId });

      return this.formatSuccess({
        success: true,
        goalId,
        message: `Key Results цели ${goalId} успешно очищены`,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при очистке Key Results цели ${goalId}`, error);
    }
  }
}
