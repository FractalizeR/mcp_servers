/**
 * MCP Tool для обновления очереди в Яндекс.Трекере
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { UpdateQueueDefinition } from './update-queue.definition.js';
import { UpdateQueueParamsSchema } from './update-queue.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';
import type { UpdateQueueDto } from '@tracker_api/dto/index.js';

export class UpdateQueueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: buildToolName('update_queue', MCP_TOOL_PREFIX),
    description: '[Queues/Write] Обновить параметры очереди',
    category: ToolCategory.QUEUES,
    subcategory: 'write',
    priority: ToolPriority.CRITICAL,
    tags: ['queue', 'update', 'write'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

  private readonly definition = new UpdateQueueDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateQueueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, name, lead, defaultType, defaultPriority, description, issueTypes } =
      validation.data;

    try {
      this.logger.info('Обновление очереди', {
        queueId,
        fieldsToUpdate: Object.keys(validation.data).filter((k) => k !== 'queueId'),
      });

      const updates: UpdateQueueDto = {};
      if (name !== undefined) updates.name = name;
      if (lead !== undefined) updates.lead = lead;
      if (defaultType !== undefined) updates.defaultType = defaultType;
      if (defaultPriority !== undefined) updates.defaultPriority = defaultPriority;
      if (description !== undefined) updates.description = description;
      if (issueTypes !== undefined) updates.issueTypes = issueTypes;

      const updatedQueue = await this.facade.updateQueue({ queueId, updates });

      this.logger.info('Очередь успешно обновлена', {
        queueKey: updatedQueue.key,
        queueName: updatedQueue.name,
      });

      return this.formatSuccess({
        queueKey: updatedQueue.key,
        queue: updatedQueue,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении очереди ${queueId}`, error as Error);
    }
  }
}
