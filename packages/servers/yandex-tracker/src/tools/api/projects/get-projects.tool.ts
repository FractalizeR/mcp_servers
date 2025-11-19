/**
 * MCP Tool для получения списка проектов в Яндекс.Трекере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetProjectsDefinition } from './get-projects.definition.js';
import { GetProjectsParamsSchema } from './get-projects.schema.js';

import { GET_PROJECTS_TOOL_METADATA } from './get-projects.metadata.js';

export class GetProjectsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_PROJECTS_TOOL_METADATA;

  private readonly definition = new GetProjectsDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetProjectsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { perPage, page, expand, queueId } = validation.data;

    try {
      this.logger.info('Получение списка проектов', {
        perPage: perPage ?? 50,
        page: page ?? 1,
        expand: expand ?? 'none',
        queueId: queueId ?? 'all',
      });

      const result = await this.facade.getProjects({
        perPage,
        page,
        expand,
        queueId,
      });

      this.logger.info('Список проектов получен', {
        count: result.projects.length,
        total: result.total,
      });

      return this.formatSuccess({
        projects: result.projects,
        total: result.total,
        count: result.projects.length,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка проектов', error as Error);
    }
  }
}
