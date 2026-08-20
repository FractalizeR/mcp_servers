/**
 * MCP Tool для создания локального поля очереди
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { QueueLocalFieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateQueueLocalFieldParamsSchema } from './create-queue-local-field.schema.js';

import { CREATE_QUEUE_LOCAL_FIELD_TOOL_METADATA } from './create-queue-local-field.metadata.js';

export class CreateQueueLocalFieldTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_QUEUE_LOCAL_FIELD_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateQueueLocalFieldParamsSchema {
    return CreateQueueLocalFieldParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateQueueLocalFieldParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId, id, nameEn, nameRu, category, type, fields } = validation.data;

    try {
      this.logger.info('Создание локального поля очереди', { queueId, id });

      const created = await this.facade.createQueueLocalField({
        queueId,
        id,
        nameEn,
        nameRu,
        category,
        type,
      });

      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<QueueLocalFieldWithUnknownFields>(created, fields);

      return this.formatSuccess(
        {
          localField: filtered,
          message: `Локальное поле "${id}" очереди ${queueId} успешно создано`,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании локального поля очереди ${queueId}`, error);
    }
  }
}
