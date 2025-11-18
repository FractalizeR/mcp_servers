/**
 * MCP Tool для получения одного проекта в Яндекс.Трекере
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetProjectDefinition } from './get-project.definition.js';
import { GetProjectParamsSchema } from './get-project.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

export class GetProjectTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: buildToolName('get_project', MCP_TOOL_PREFIX),
    description: '[Projects/Read] Получить параметры проекта',
    category: ToolCategory.PROJECTS,
    subcategory: 'read',
    priority: ToolPriority.HIGH,
    tags: ['project', 'read', 'details'],
    isHelper: false,
    requiresExplicitUserConsent: false,
  } as const;

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
