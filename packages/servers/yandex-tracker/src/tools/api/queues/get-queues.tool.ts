/**
 * MCP Tool для получения списка очередей в Яндекс.Трекере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetQueuesDefinition } from './get-queues.definition.js';
import { GetQueuesParamsSchema } from './get-queues.schema.js';

import { GET_QUEUES_TOOL_METADATA } from './get-queues.metadata.js';

/**
 * Инструмент для получения списка очередей
 */
export class GetQueuesTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_QUEUES_TOOL_METADATA;

  private readonly definition = new GetQueuesDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetQueuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { perPage = 50, page = 1, expand } = validation.data;

    try {
      this.logger.info('Получение списка очередей', {
        perPage,
        page,
        expand: expand ?? 'none',
      });

      const queues = await this.facade.getQueues({ perPage, page, expand });

      this.logger.info('Список очередей получен', {
        count: queues.length,
        page,
      });

      return this.formatSuccess({
        queues,
        count: queues.length,
        page,
        perPage,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка очередей', error as Error);
    }
  }
}
