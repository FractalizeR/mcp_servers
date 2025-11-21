/**
 * MCP Tool для удаления компонента в Яндекс.Трекере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteComponentParamsSchema } from './delete-component.schema.js';

import { DELETE_COMPONENT_TOOL_METADATA } from './delete-component.metadata.js';

/**
 * Инструмент для удаления компонента
 */
export class DeleteComponentTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = DELETE_COMPONENT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof DeleteComponentParamsSchema {
    return DeleteComponentParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteComponentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { componentId } = validation.data;

    try {
      this.logger.info('Удаление компонента', {
        componentId,
      });

      await this.facade.deleteComponent({ componentId });

      this.logger.info('Компонент удален', {
        componentId,
      });

      return this.formatSuccess({
        success: true,
        componentId,
        message: `Компонент ${componentId} успешно удален`,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при удалении компонента', error as Error);
    }
  }
}
