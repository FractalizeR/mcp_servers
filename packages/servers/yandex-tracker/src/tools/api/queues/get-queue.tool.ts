/**
 * MCP Tool для получения одной очереди в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetQueueDefinition } from './get-queue.definition.js';
import { GetQueueParamsSchema } from './get-queue.schema.js';

import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { GET_QUEUE_TOOL_METADATA } from './get-queue.metadata.js';

export class GetQueueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_QUEUE_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetQueueParamsSchema {
    return GetQueueParamsSchema;
  }

  /**
   * @deprecated Используется автогенерация через getParamsSchema()
   */
  protected buildDefinition(): ToolDefinition {
    // Fallback для обратной совместимости (не используется если getParamsSchema() определен)
    const definition = new GetQueueDefinition();
    return definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetQueueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, queueId, expand } = validation.data;

    try {
      this.logger.info('Получение очереди', {
        queueId,
        expand: expand ?? 'none',
      });

      const queue = await this.facade.getQueue({ queueId, expand });

      this.logger.info('Очередь получена', {
        queueKey: queue.key,
        queueName: queue.name,
      });

      const filteredQueue = ResponseFieldFilter.filter<QueueWithUnknownFields>(queue, fields);

      return this.formatSuccess({
        queue: filteredQueue,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении очереди ${queueId}`, error as Error);
    }
  }
}
