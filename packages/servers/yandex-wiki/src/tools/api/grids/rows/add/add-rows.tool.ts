import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { AddRowsParamsSchema, AddRowsOutputDataSchema } from './add-rows.schema.js';
import { ADD_ROWS_TOOL_METADATA } from './add-rows.metadata.js';
import {
  withDefinitionExtras,
  buildOutputSchema,
} from '../../../../shared/tool-definition-extras.js';

export class AddRowsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = ADD_ROWS_TOOL_METADATA;

  protected override getParamsSchema(): typeof AddRowsParamsSchema {
    return AddRowsParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Добавить строки в таблицу',
      outputSchema: buildOutputSchema(AddRowsOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, AddRowsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, rows, revision, position, after_row_id } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Добавление строк', rows.length);

      const grid = await this.facade.addRows(idx, {
        rows,
        ...(revision !== undefined && { revision }),
        ...(position !== undefined && { position }),
        ...(after_row_id !== undefined && { after_row_id }),
      });

      return this.formatSuccess({
        message: `Добавлено ${rows.length} строк в таблицу ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при добавлении строк в таблицу: ${idx}`, error);
    }
  }
}
