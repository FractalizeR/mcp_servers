import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { DeletePageParamsSchema, DeletePageOutputDataSchema } from './delete-page.schema.js';
import { DELETE_PAGE_TOOL_METADATA } from './delete-page.metadata.js';
import { withDefinitionExtras, buildOutputSchema } from '../../../shared/tool-definition-extras.js';

export class DeletePageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = DELETE_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof DeletePageParamsSchema {
    return DeletePageParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Удалить страницу',
      outputSchema: buildOutputSchema(DeletePageOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeletePageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Удаление страницы', 1);

      const result = await this.facade.deletePage(idx);

      return this.formatSuccess({
        message: `Страница ${idx} успешно удалена`,
        recovery_token: result.recovery_token,
        hint: 'Используйте recovery_token для восстановления страницы',
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении страницы: ${idx}`, error);
    }
  }
}
