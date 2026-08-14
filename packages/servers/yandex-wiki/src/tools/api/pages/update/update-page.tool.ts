import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { UpdatePageParamsSchema, UpdatePageOutputDataSchema } from './update-page.schema.js';
import { UPDATE_PAGE_TOOL_METADATA } from './update-page.metadata.js';
import { withDefinitionExtras, buildOutputSchema } from '../../../shared/tool-definition-extras.js';

export class UpdatePageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = UPDATE_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdatePageParamsSchema {
    return UpdatePageParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Обновить страницу',
      outputSchema: buildOutputSchema(UpdatePageOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdatePageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, title, content, allow_merge, fields, is_silent } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Обновление страницы', 1);

      const page = await this.facade.updatePage({
        idx,
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        },
        ...(allow_merge !== undefined && { allow_merge }),
        ...(fields !== undefined && { fields }),
        ...(is_silent !== undefined && { is_silent }),
      });

      return this.formatSuccess({
        message: `Страница ${idx} успешно обновлена`,
        page,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении страницы: ${idx}`, error);
    }
  }
}
