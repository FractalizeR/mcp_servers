/**
 * MCP Tool для получения списка локальных полей очереди
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { QueueLocalFieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetQueueLocalFieldsParamsSchema } from './get-queue-local-fields.schema.js';

import { GET_QUEUE_LOCAL_FIELDS_TOOL_METADATA } from './get-queue-local-fields.metadata.js';

export class GetQueueLocalFieldsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_QUEUE_LOCAL_FIELDS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetQueueLocalFieldsParamsSchema {
    return GetQueueLocalFieldsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetQueueLocalFieldsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, fields } = validation.data;

    try {
      this.logger.info('Получение локальных полей очереди', { queueId });

      const result = await this.facade.getQueueLocalFields({ queueId });

      const filtered = result.items.map((item) =>
        ResponseFieldFilter.filter<QueueLocalFieldWithUnknownFields>(item, fields)
      );

      return this.formatSuccess({
        localFields: filtered,
        count: filtered.length,
        queueId,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении локальных полей очереди ${queueId}`, error);
    }
  }
}
