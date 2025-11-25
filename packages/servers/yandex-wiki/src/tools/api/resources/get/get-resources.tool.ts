import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetResourcesParamsSchema } from './get-resources.schema.js';
import { GET_RESOURCES_TOOL_METADATA } from './get-resources.metadata.js';

export class GetResourcesTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = GET_RESOURCES_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetResourcesParamsSchema {
    return GetResourcesParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetResourcesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, cursor, order_by, order_direction, page_id, page_size, q, types } =
      validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Получение ресурсов страницы', 1);

      const response = await this.facade.getResources({
        idx,
        ...(cursor !== undefined && { cursor }),
        ...(order_by !== undefined && { order_by }),
        ...(order_direction !== undefined && { order_direction }),
        ...(page_id !== undefined && { page_id }),
        ...(page_size !== undefined && { page_size }),
        ...(q !== undefined && { q }),
        ...(types !== undefined && { types }),
      });

      return this.formatSuccess({
        message: `Получено ${response.results.length} ресурсов для страницы ${idx}`,
        results: response.results,
        next_cursor: response.next_cursor,
        prev_cursor: response.prev_cursor,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении ресурсов страницы: ${idx}`, error);
    }
  }
}
