/**
 * MCP Tool для получения списка очередей в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetQueuesParamsSchema } from './get-queues.schema.js';

import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { GET_QUEUES_TOOL_METADATA } from './get-queues.metadata.js';

/**
 * Инструмент для получения списка очередей
 */
export class GetQueuesTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_QUEUES_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetQueuesParamsSchema {
    return GetQueuesParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetQueuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, perPage = 50, page = 1, expand } = validation.data;

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

      const filteredQueues = queues.map((queue) =>
        ResponseFieldFilter.filter<QueueWithUnknownFields>(queue, fields)
      );

      return this.formatSuccess({
        queues: filteredQueues,
        count: filteredQueues.length,
        page,
        perPage,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка очередей', error);
    }
  }
}
