/**
 * MCP Tool for getting all TickTick projects
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import { GET_PROJECTS_TOOL_METADATA } from './get-projects.metadata.js';
import { GetProjectsParamsSchema, GET_PROJECTS_OUTPUT_SCHEMA } from './get-projects.schema.js';

export class GetProjectsTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_PROJECTS_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof GetProjectsParamsSchema {
    return GetProjectsParamsSchema;
  }

  /**
   * Extend auto-generated definition with title/outputSchema/annotations
   * (пакет 3.1.C.ticktick — не выводятся автоматически из METADATA, см.
   * base-tool.ts getDefinition()).
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Get Projects',
      outputSchema: GET_PROJECTS_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetProjectsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields } = validation.data;

    try {
      this.logger.info('Получение списка проектов');

      const projects = await this.facade.getProjects();

      this.logger.info('Список проектов получен', {
        count: projects.length,
      });

      const filteredProjects = projects.map((project) =>
        ResponseFieldFilter.filter<ProjectWithUnknownFields>(project, fields)
      );

      return this.formatSuccess({
        total: filteredProjects.length,
        projects: filteredProjects,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка проектов', error);
    }
  }
}
