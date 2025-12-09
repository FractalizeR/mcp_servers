/**
 * MCP Tool для обновления очереди в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { UpdateQueueParamsSchema } from './update-queue.schema.js';

import type { UpdateQueueDto } from '#tracker_api/dto/index.js';
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { UPDATE_QUEUE_TOOL_METADATA } from './update-queue.metadata.js';

export class UpdateQueueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_QUEUE_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof UpdateQueueParamsSchema {
    return UpdateQueueParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateQueueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, queueId, name, lead, defaultType, defaultPriority, description, issueTypes } =
      validation.data;

    try {
      this.logger.info('Обновление очереди', {
        queueId,
        fieldsToUpdate: Object.keys(validation.data).filter(
          (k) => k !== 'queueId' && k !== 'fields'
        ),
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

      const filteredQueue = ResponseFieldFilter.filter<QueueWithUnknownFields>(
        updatedQueue,
        fields
      );

      return this.formatSuccess({
        queueKey: updatedQueue.key,
        queue: filteredQueue,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении очереди ${queueId}`, error);
    }
  }
}
