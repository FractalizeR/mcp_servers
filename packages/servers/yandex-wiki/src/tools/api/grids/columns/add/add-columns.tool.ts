import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { AddColumnsParamsSchema, AddColumnsOutputDataSchema } from './add-columns.schema.js';
import { ADD_COLUMNS_TOOL_METADATA } from './add-columns.metadata.js';
import {
  withDefinitionExtras,
  buildOutputSchema,
} from '../../../../shared/tool-definition-extras.js';

export class AddColumnsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = ADD_COLUMNS_TOOL_METADATA;

  protected override getParamsSchema(): typeof AddColumnsParamsSchema {
    return AddColumnsParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Добавить колонки в таблицу',
      outputSchema: buildOutputSchema(AddColumnsOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, AddColumnsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, columns, revision, position } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Добавление колонок', columns.length);

      const grid = await this.facade.addColumns(idx, {
        columns,
        ...(revision !== undefined && { revision }),
        ...(position !== undefined && { position }),
      });

      return this.formatSuccess({
        message: `Добавлено ${columns.length} колонок в таблицу ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при добавлении колонок в таблицу: ${idx}`, error);
    }
  }
}
