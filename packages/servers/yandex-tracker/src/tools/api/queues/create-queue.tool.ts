/**
 * MCP Tool для создания очереди в Яндекс.Трекере
 *
 * ВАЖНО: Создание очередей - администраторская операция!
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { CreateQueueDefinition } from './create-queue.definition.js';
import { CreateQueueParamsSchema } from './create-queue.schema.js';

import type { CreateQueueDto } from '@tracker_api/dto/index.js';
import type { QueueWithUnknownFields } from '@tracker_api/entities/index.js';
import { CREATE_QUEUE_TOOL_METADATA } from './create-queue.metadata.js';

export class CreateQueueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_QUEUE_TOOL_METADATA;

  private readonly definition = new CreateQueueDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateQueueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, key, name, lead, defaultType, defaultPriority, description, issueTypes } =
      validation.data;

    try {
      this.logger.info('Создание новой очереди', {
        key,
        name,
        lead,
      });

      const queueData: CreateQueueDto = {
        key,
        name,
        lead,
        defaultType,
        defaultPriority,
        ...(description && { description }),
        ...(issueTypes && { issueTypes }),
      };

      const createdQueue = await this.facade.createQueue(queueData);

      this.logger.info('Очередь успешно создана', {
        queueKey: createdQueue.key,
        queueName: createdQueue.name,
      });

      const filteredQueue = ResponseFieldFilter.filter<QueueWithUnknownFields>(
        createdQueue,
        fields
      );

      return this.formatSuccess({
        queueKey: createdQueue.key,
        queue: filteredQueue,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании очереди ${key}`, error as Error);
    }
  }
}
