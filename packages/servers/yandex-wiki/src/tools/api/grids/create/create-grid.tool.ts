import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { CreateGridParamsSchema } from './create-grid.schema.js';
import { CREATE_GRID_TOOL_METADATA } from './create-grid.metadata.js';

export class CreateGridTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = CREATE_GRID_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateGridParamsSchema {
    return CreateGridParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateGridParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { title, page_id, page_slug } = validation.data;

    if (!page_id && !page_slug) {
      return this.formatError('Необходимо указать page_id или page_slug');
    }

    try {
      ResultLogger.logOperationStart(this.logger, 'Создание таблицы', 1);

      const grid = await this.facade.createGrid({
        title,
        page: {
          ...(page_id !== undefined && { id: page_id }),
          ...(page_slug !== undefined && { slug: page_slug }),
        },
      });

      return this.formatSuccess({
        message: `Таблица "${title}" успешно создана`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании таблицы: ${title}`, error);
    }
  }
}
