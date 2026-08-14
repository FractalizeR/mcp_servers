import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { CreatePageParamsSchema, CreatePageOutputDataSchema } from './create-page.schema.js';
import { CREATE_PAGE_TOOL_METADATA } from './create-page.metadata.js';
import { withDefinitionExtras, buildOutputSchema } from '../../../shared/tool-definition-extras.js';

export class CreatePageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = CREATE_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreatePageParamsSchema {
    return CreatePageParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Создать страницу',
      outputSchema: buildOutputSchema(CreatePageOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreatePageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { page_type, slug, title, content, grid_format, fields, is_silent } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Создание страницы', 1);

      const page = await this.facade.createPage({
        data: {
          page_type,
          slug,
          title,
          ...(content !== undefined && { content }),
          ...(grid_format !== undefined && { grid_format }),
        },
        ...(fields !== undefined && { fields }),
        ...(is_silent !== undefined && { is_silent }),
      });

      return this.formatSuccess({
        message: `Страница "${title}" успешно создана`,
        page,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании страницы: ${slug}`, error);
    }
  }
}
