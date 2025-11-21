/**
 * MCP Tool для обновления проекта в Яндекс.Трекере
 *
 * ВАЖНО: Обновление проектов - администраторская операция!
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { UpdateProjectDefinition } from './update-project.definition.js';
import { UpdateProjectParamsSchema } from './update-project.schema.js';

import type { UpdateProjectDto } from '#tracker_api/dto/index.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import { UPDATE_PROJECT_TOOL_METADATA } from './update-project.metadata.js';

export class UpdateProjectTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_PROJECT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof UpdateProjectParamsSchema {
    return UpdateProjectParamsSchema;
  }

  /**
   * @deprecated Используется автогенерация через getParamsSchema()
   */
  protected buildDefinition(): ToolDefinition {
    // Fallback для обратной совместимости (не используется если getParamsSchema() определен)
    const definition = new UpdateProjectDefinition();
    return definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const {
      fields,
      projectId,
      name,
      lead,
      status,
      description,
      startDate,
      endDate,
      queueIds,
      teamUserIds,
    } = validation.data;

    try {
      this.logger.info('Обновление проекта', {
        projectId,
      });

      const updateData: UpdateProjectDto = {
        ...(name && { name }),
        ...(lead && { lead }),
        ...(status && { status }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(queueIds && { queueIds }),
        ...(teamUserIds && { teamUserIds }),
      };

      const updatedProject = await this.facade.updateProject({
        projectId,
        data: updateData,
      });

      this.logger.info('Проект успешно обновлен', {
        projectKey: updatedProject.key,
        projectName: updatedProject.name,
      });

      const filteredProject = ResponseFieldFilter.filter<ProjectWithUnknownFields>(
        updatedProject,
        fields
      );

      return this.formatSuccess({
        projectKey: updatedProject.key,
        project: filteredProject,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении проекта ${projectId}`, error as Error);
    }
  }
}
