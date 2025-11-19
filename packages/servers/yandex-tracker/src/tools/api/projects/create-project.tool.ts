/**
 * MCP Tool для создания проекта в Яндекс.Трекере
 *
 * ВАЖНО: Создание проектов - администраторская операция!
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { CreateProjectDefinition } from './create-project.definition.js';
import { CreateProjectParamsSchema } from './create-project.schema.js';

import type { CreateProjectDto } from '@tracker_api/dto/index.js';
import { CREATE_PROJECT_TOOL_METADATA } from './create-project.metadata.js';

export class CreateProjectTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_PROJECT_TOOL_METADATA;

  private readonly definition = new CreateProjectDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { key, name, lead, status, description, startDate, endDate, queueIds, teamUserIds } =
      validation.data;

    try {
      this.logger.info('Создание нового проекта', {
        key,
        name,
        lead,
      });

      const projectData: CreateProjectDto = {
        key,
        name,
        lead,
        ...(status && { status }),
        ...(description && { description }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(queueIds && { queueIds }),
        ...(teamUserIds && { teamUserIds }),
      };

      const createdProject = await this.facade.createProject(projectData);

      this.logger.info('Проект успешно создан', {
        projectKey: createdProject.key,
        projectName: createdProject.name,
        projectId: createdProject.id,
      });

      return this.formatSuccess({
        projectKey: createdProject.key,
        project: createdProject,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании проекта ${key}`, error as Error);
    }
  }
}
