import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { DeleteGridParamsSchema, DeleteGridOutputDataSchema } from './delete-grid.schema.js';
import { DELETE_GRID_TOOL_METADATA } from './delete-grid.metadata.js';
import { withDefinitionExtras, buildOutputSchema } from '../../../shared/tool-definition-extras.js';

export class DeleteGridTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = DELETE_GRID_TOOL_METADATA;

  protected override getParamsSchema(): typeof DeleteGridParamsSchema {
    return DeleteGridParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Удалить таблицу',
      outputSchema: buildOutputSchema(DeleteGridOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteGridParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Удаление таблицы', 1);

      const result = await this.facade.deleteGrid(idx);

      return this.formatSuccess({
        message: `Таблица ${idx} успешно удалена`,
        recovery_token: result.recovery_token,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении таблицы: ${idx}`, error);
    }
  }
}
