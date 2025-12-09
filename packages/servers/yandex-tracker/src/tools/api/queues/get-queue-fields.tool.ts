/**
 * MCP Tool для получения обязательных полей очереди в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { GetQueueFieldsParamsSchema } from './get-queue-fields.schema.js';

import type { QueueFieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { GET_QUEUE_FIELDS_TOOL_METADATA } from './get-queue-fields.metadata.js';

export class GetQueueFieldsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_QUEUE_FIELDS_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetQueueFieldsParamsSchema {
    return GetQueueFieldsParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetQueueFieldsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields: fieldsParam, queueId } = validation.data;

    try {
      this.logger.info('Получение полей очереди', {
        queueId,
      });

      const queueFields = await this.facade.getQueueFields({ queueId });

      this.logger.info('Поля очереди получены', {
        queueId,
        count: queueFields.length,
      });

      const filteredFields = queueFields.map((field) =>
        ResponseFieldFilter.filter<QueueFieldWithUnknownFields>(field, fieldsParam)
      );

      return this.formatSuccess({
        fields: filteredFields,
        count: filteredFields.length,
        fieldsReturned: fieldsParam,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении полей очереди ${queueId}`, error);
    }
  }
}
