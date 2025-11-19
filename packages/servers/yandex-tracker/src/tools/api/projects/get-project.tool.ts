/**
 * MCP Tool для получения одного проекта в Яндекс.Трекере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetProjectDefinition } from './get-project.definition.js';
import { GetProjectParamsSchema } from './get-project.schema.js';

import { GET_PROJECT_TOOL_METADATA } from './get-project.metadata.js';

export class GetProjectTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_PROJECT_TOOL_METADATA;

  private readonly definition = new GetProjectDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId, expand } = validation.data;

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

      return this.formatSuccess({
        project,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении проекта ${projectId}`, error as Error);
    }
  }
}
