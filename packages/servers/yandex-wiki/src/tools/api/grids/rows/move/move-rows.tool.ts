import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { MoveRowsParamsSchema, MoveRowsOutputDataSchema } from './move-rows.schema.js';
import { MOVE_ROWS_TOOL_METADATA } from './move-rows.metadata.js';
import {
  withDefinitionExtras,
  buildOutputSchema,
} from '../../../../shared/tool-definition-extras.js';

export class MoveRowsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = MOVE_ROWS_TOOL_METADATA;

  protected override getParamsSchema(): typeof MoveRowsParamsSchema {
    return MoveRowsParamsSchema;
  }

  /**
   * idempotentHint: true — параметры адресуют строку по стабильному row_id и
   * абсолютной цели (position или after_row_id), а не относительным сдвигом
   * ("на 1 вверх"); повтор с теми же аргументами сходится к тому же порядку
   * строк. Отличие от add_rows (там повтор — вставка новых строк, не
   * идемпотентно) и update_cells (тоже сходится, но это не позиционирование).
   */
  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Переместить строки в таблице',
      outputSchema: buildOutputSchema(MoveRowsOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, MoveRowsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, row_id, after_row_id, position, revision, rows_count } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Перемещение строк', 1);

      const grid = await this.facade.moveRows(idx, {
        row_id,
        ...(after_row_id !== undefined && { after_row_id }),
        ...(position !== undefined && { position }),
        ...(revision !== undefined && { revision }),
        ...(rows_count !== undefined && { rows_count }),
      });

      return this.formatSuccess({
        message: `Строка ${row_id} перемещена в таблице ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при перемещении строк в таблице: ${idx}`, error);
    }
  }
}
