/**
 * MCP Tool для обновления проекта в Яндекс.Трекере
 *
 * ВАЖНО: Обновление проектов - администраторская операция!
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { UpdateProjectDefinition } from './update-project.definition.js';
import { UpdateProjectParamsSchema } from './update-project.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';
import type { UpdateProjectDto } from '@tracker_api/dto/index.js';

export class UpdateProjectTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: buildToolName('update_project', MCP_TOOL_PREFIX),
    description: '[Projects/Write] Обновить проект',
    category: ToolCategory.PROJECTS,
    subcategory: 'write',
    priority: ToolPriority.CRITICAL,
    tags: ['project', 'update', 'write'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

  private readonly definition = new UpdateProjectDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const {
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

      return this.formatSuccess({
        projectKey: updatedProject.key,
        project: updatedProject,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении проекта ${projectId}`, error as Error);
    }
  }
}
