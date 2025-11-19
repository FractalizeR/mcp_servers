/**
 * MCP Tool для управления доступом к очереди в Яндекс.Трекере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ManageQueueAccessDefinition } from './manage-queue-access.definition.js';
import { ManageQueueAccessParamsSchema } from './manage-queue-access.schema.js';

import { MANAGE_QUEUE_ACCESS_TOOL_METADATA } from './manage-queue-access.metadata.js';

export class ManageQueueAccessTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = MANAGE_QUEUE_ACCESS_TOOL_METADATA;

  private readonly definition = new ManageQueueAccessDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, ManageQueueAccessParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, role, subjects, action } = validation.data;

    try {
      this.logger.info('Управление доступом к очереди', {
        queueId,
        role,
        subjectsCount: subjects.length,
        action,
      });

      const permissions = await this.facade.manageQueueAccess({
        queueId,
        accessData: { role, subjects, action },
      });

      this.logger.info('Права доступа успешно обновлены', {
        queueId,
        action,
        subjectsCount: subjects.length,
      });

      return this.formatSuccess({
        queueId,
        role,
        action,
        subjectsProcessed: subjects.length,
        permissions,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при управлении доступом к очереди ${queueId}`,
        error as Error
      );
    }
  }
}
