/**
 * MCP Tool для получения одного проекта в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetProjectParamsSchema } from './get-project.schema.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';

import { GET_PROJECT_TOOL_METADATA } from './get-project.metadata.js';

export class GetProjectTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_PROJECT_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetProjectParamsSchema {
    return GetProjectParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, projectId, expand } = validation.data;

    try {
      this.logger.info('Получение проекта', {
        projectId,
        expand: expand ?? 'none',
      });

      const project = await this.facade.getProject({ projectId, expand });

      this.logger.info('Проект получен', {
        projectKey: project.key,
        projectName: project.name,
      });

      const filteredProject = ResponseFieldFilter.filter<ProjectWithUnknownFields>(project, fields);

      return this.formatSuccess({
        project: filteredProject,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении проекта ${projectId}`, error);
    }
  }
}
