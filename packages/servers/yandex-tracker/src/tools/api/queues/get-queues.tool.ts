/**
 * MCP Tool для получения списка очередей в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
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

    const { fields, perPage, cursor, expand, fetchAll, maxItems } = validation.data;

    try {
      this.logger.info('Получение списка очередей', {
        expand: expand ?? 'none',
      });

      const result = await this.facade.getQueues({ perPage, cursor, expand, fetchAll, maxItems });

      this.logger.info('Список очередей получен', {
        count: result.items.length,
      });

      const { result: filteredQueues, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        QueueWithUnknownFields[]
      >(result.items, fields);

      return this.formatSuccess(
        {
          queues: filteredQueues,
          count: filteredQueues.length,
          pagination: result.pagination,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка очередей', error);
    }
  }
}
