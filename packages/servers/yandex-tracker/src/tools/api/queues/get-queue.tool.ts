/**
 * MCP Tool для получения одной очереди в Яндекс.Трекере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetQueueDefinition } from './get-queue.definition.js';
import { GetQueueParamsSchema } from './get-queue.schema.js';

import { GET_QUEUE_TOOL_METADATA } from './get-queue.metadata.js';

export class GetQueueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_QUEUE_TOOL_METADATA;

  private readonly definition = new GetQueueDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetQueueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, expand } = validation.data;

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

      return this.formatSuccess({
        queue,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении очереди ${queueId}`, error as Error);
    }
  }
}
