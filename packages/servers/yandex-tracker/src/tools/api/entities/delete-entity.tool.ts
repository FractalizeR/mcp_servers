/**
 * MCP Tool для удаления записи Entity API (Goal/Project/Portfolio)
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DeleteEntityParamsSchema } from './delete-entity.schema.js';

import { DELETE_ENTITY_TOOL_METADATA } from './delete-entity.metadata.js';

export class DeleteEntityTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = DELETE_ENTITY_TOOL_METADATA;

  protected override getParamsSchema(): typeof DeleteEntityParamsSchema {
    return DeleteEntityParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteEntityParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { entityType, entityId } = validation.data;

    try {
      this.logger.info('Удаление записи Entity API', { entityType, entityId });

      await this.facade.deleteEntity({ entityType, entityId });

      return this.formatSuccess({
        success: true,
        entityType,
        entityId,
        message: `Запись ${entityType}/${entityId} успешно удалена`,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении записи Entity API ${entityType}/${entityId}`,
        error
      );
    }
  }
}
