/**
 * MCP Tool для удаления проекта в Яндекс.Трекере
 *
 * ВАЖНО: Удаление проектов - критическая операция! Необратима!
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteProjectDefinition } from './delete-project.definition.js';
import { DeleteProjectParamsSchema } from './delete-project.schema.js';

import { DELETE_PROJECT_TOOL_METADATA } from './delete-project.metadata.js';

export class DeleteProjectTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = DELETE_PROJECT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof DeleteProjectParamsSchema {
    return DeleteProjectParamsSchema;
  }

  /**
   * @deprecated Используется автогенерация через getParamsSchema()
   */
  protected buildDefinition(): ToolDefinition {
    // Fallback для обратной совместимости (не используется если getParamsSchema() определен)
    const definition = new DeleteProjectDefinition();
    return definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId } = validation.data;

    try {
      this.logger.info('Удаление проекта', {
        projectId,
      });

      await this.facade.deleteProject({ projectId });

      this.logger.info('Проект успешно удален', {
        projectId,
      });

      return this.formatSuccess({
        message: `Проект ${projectId} успешно удален`,
        projectId,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении проекта ${projectId}`, error as Error);
    }
  }
}
