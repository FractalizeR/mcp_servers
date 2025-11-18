/**
 * MCP Tool для управления доступом к очереди в Яндекс.Трекере
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ManageQueueAccessDefinition } from './manage-queue-access.definition.js';
import { ManageQueueAccessParamsSchema } from './manage-queue-access.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

export class ManageQueueAccessTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: buildToolName('manage_queue_access', MCP_TOOL_PREFIX),
    description: '[Queues/Write] Управление доступом к очереди',
    category: ToolCategory.QUEUES,
    subcategory: 'write',
    priority: ToolPriority.CRITICAL,
    tags: ['queue', 'access', 'permissions', 'write'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

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
