/**
 * MCP Tool для управления жизненным циклом спринта (старт/архивация/удаление)
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ManageSprintLifecycleParamsSchema } from './manage-sprint-lifecycle.schema.js';

import { MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA } from './manage-sprint-lifecycle.metadata.js';

const ACTION_MESSAGES: Record<string, string> = {
  start: 'запущен',
  archive: 'архивирован',
  delete: 'удалён',
};

export class ManageSprintLifecycleTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA;

  protected override getParamsSchema(): typeof ManageSprintLifecycleParamsSchema {
    return ManageSprintLifecycleParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, ManageSprintLifecycleParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { sprintId, action } = validation.data;

    try {
      this.logger.info('Управление жизненным циклом спринта', { sprintId, action });

      const sprint = await this.facade.manageSprintLifecycle({ sprintId, action });

      return this.formatSuccess({
        sprintId,
        action,
        sprint,
        message: `Спринт ${sprintId} успешно ${ACTION_MESSAGES[action]}`,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при выполнении действия "${action}" над спринтом ${sprintId}`,
        error
      );
    }
  }
}
