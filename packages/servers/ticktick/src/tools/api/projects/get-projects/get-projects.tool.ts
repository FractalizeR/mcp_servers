/**
 * MCP Tool for getting all TickTick projects
 */

import {
  BaseTool,
  ResponseFieldFilter,
  resolveCollectionResponseMode,
} from '@fractalizer/mcp-core';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import { buildProjectResourceLink } from '#tools/shared/index.js';
import { GET_PROJECTS_TOOL_METADATA } from './get-projects.metadata.js';
import { GetProjectsParamsSchema } from './get-projects.schema.js';

export class GetProjectsTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_PROJECTS_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof GetProjectsParamsSchema {
    return GetProjectsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetProjectsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, responseMode } = validation.data;

    try {
      this.logger.info('Получение списка проектов');

      const projects = await this.facade.getProjects();

      this.logger.info('Список проектов получен', {
        count: projects.length,
      });

      const resolvedMode = resolveCollectionResponseMode(responseMode, projects.length);
      const items =
        resolvedMode === 'full'
          ? projects.map((project) =>
              ResponseFieldFilter.filter<ProjectWithUnknownFields>(project, fields)
            )
          : projects;

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildProjectResourceLink,
        summary: { fieldsReturned: fields },
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка проектов', error);
    }
  }
}
