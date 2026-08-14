import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { ClonePageParamsSchema, ClonePageOutputDataSchema } from './clone-page.schema.js';
import { CLONE_PAGE_TOOL_METADATA } from './clone-page.metadata.js';
import { withDefinitionExtras, buildOutputSchema } from '../../../shared/tool-definition-extras.js';

export class ClonePageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = CLONE_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof ClonePageParamsSchema {
    return ClonePageParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Клонировать страницу',
      outputSchema: buildOutputSchema(ClonePageOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, ClonePageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, target, title, subscribe_me } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Клонирование страницы', 1);

      const operation = await this.facade.clonePage(idx, {
        target,
        ...(title !== undefined && { title }),
        ...(subscribe_me !== undefined && { subscribe_me }),
      });

      return this.formatSuccess({
        message: `Клонирование страницы ${idx} запущено`,
        operation_id: operation.operation.id,
        operation_type: operation.operation.type,
        status_url: operation.status_url,
        dry_run: operation.dry_run,
        hint: 'Используйте status_url для отслеживания статуса операции',
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при клонировании страницы: ${idx}`, error);
    }
  }
}
