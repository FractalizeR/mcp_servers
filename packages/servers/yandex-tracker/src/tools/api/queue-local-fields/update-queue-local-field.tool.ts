/**
 * MCP Tool для обновления локального поля очереди
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { QueueLocalFieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateQueueLocalFieldParamsSchema } from './update-queue-local-field.schema.js';

import { UPDATE_QUEUE_LOCAL_FIELD_TOOL_METADATA } from './update-queue-local-field.metadata.js';

export class UpdateQueueLocalFieldTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_QUEUE_LOCAL_FIELD_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateQueueLocalFieldParamsSchema {
    return UpdateQueueLocalFieldParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateQueueLocalFieldParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, key, fields, ...updateData } = validation.data;

    try {
      this.logger.info('Обновление локального поля очереди', { queueId, key });

      const updated = await this.facade.updateQueueLocalField({ queueId, key, ...updateData });

      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<QueueLocalFieldWithUnknownFields>(updated, fields);

      return this.formatSuccess(
        { localField: filtered },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при обновлении локального поля ${key} очереди ${queueId}`,
        error
      );
    }
  }
}
