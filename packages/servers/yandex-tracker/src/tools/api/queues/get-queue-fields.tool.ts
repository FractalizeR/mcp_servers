/**
 * MCP Tool для получения обязательных полей очереди в Яндекс.Трекере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetQueueFieldsDefinition } from './get-queue-fields.definition.js';
import { GetQueueFieldsParamsSchema } from './get-queue-fields.schema.js';

import { GET_QUEUE_FIELDS_TOOL_METADATA } from './get-queue-fields.metadata.js';

export class GetQueueFieldsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_QUEUE_FIELDS_TOOL_METADATA;

  private readonly definition = new GetQueueFieldsDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetQueueFieldsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { queueId } = validation.data;

    try {
      this.logger.info('Получение полей очереди', {
        queueId,
      });

      const fields = await this.facade.getQueueFields({ queueId });

      this.logger.info('Поля очереди получены', {
        queueId,
        count: fields.length,
      });

      return this.formatSuccess({
        fields,
        count: fields.length,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении полей очереди ${queueId}`, error as Error);
    }
  }
}
