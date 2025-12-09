/**
 * MCP Tool для создания проекта в Яндекс.Трекере
 *
 * ВАЖНО: Создание проектов - администраторская операция!
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { CreateProjectParamsSchema } from './create-project.schema.js';

import type { CreateProjectDto } from '#tracker_api/dto/index.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import { CREATE_PROJECT_TOOL_METADATA } from './create-project.metadata.js';

export class CreateProjectTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_PROJECT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof CreateProjectParamsSchema {
    return CreateProjectParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const {
      fields,
      key,
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

      const filteredProject = ResponseFieldFilter.filter<ProjectWithUnknownFields>(
        createdProject,
        fields
      );

      return this.formatSuccess({
        projectKey: createdProject.key,
        project: filteredProject,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании проекта ${key}`, error);
    }
  }
}
