/**
 * MCP Tool для удаления глобального поля трекера
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DeleteGlobalFieldParamsSchema } from './delete-global-field.schema.js';

import { DELETE_GLOBAL_FIELD_TOOL_METADATA } from './delete-global-field.metadata.js';

export class DeleteGlobalFieldTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = DELETE_GLOBAL_FIELD_TOOL_METADATA;

  protected override getParamsSchema(): typeof DeleteGlobalFieldParamsSchema {
    return DeleteGlobalFieldParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteGlobalFieldParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fieldId } = validation.data;

    try {
      this.logger.info('Удаление глобального поля трекера', { fieldId });

      await this.facade.deleteField(fieldId);

      return this.formatSuccess({
        success: true,
        fieldId,
        message: `Глобальное поле ${fieldId} успешно удалено`,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении глобального поля ${fieldId}`, error);
    }
  }
}
