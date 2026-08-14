/**
 * MCP Tool для добавления Key Result к цели
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { AddGoalKeyResultParamsSchema } from './add-goal-key-result.schema.js';

import { ADD_GOAL_KEY_RESULT_TOOL_METADATA } from './add-goal-key-result.metadata.js';

export class AddGoalKeyResultTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = ADD_GOAL_KEY_RESULT_TOOL_METADATA;

  protected override getParamsSchema(): typeof AddGoalKeyResultParamsSchema {
    return AddGoalKeyResultParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, AddGoalKeyResultParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { goalId, item } = validation.data;

    try {
      this.logger.info('Добавление Key Result к цели', { goalId, type: item.type });

      const keyResults = await this.facade.addGoalKeyResult({ goalId, item });

      return this.formatSuccess({
        goalId,
        keyResults,
        count: keyResults.length,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при добавлении Key Result к цели ${goalId}`, error);
    }
  }
}
