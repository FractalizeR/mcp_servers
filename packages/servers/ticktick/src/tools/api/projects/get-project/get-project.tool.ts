/**
 * MCP Tool for getting a single TickTick project by ID
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import { GET_PROJECT_TOOL_METADATA } from './get-project.metadata.js';
import { GetProjectParamsSchema, GET_PROJECT_OUTPUT_SCHEMA } from './get-project.schema.js';

export class GetProjectTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_PROJECT_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof GetProjectParamsSchema {
    return GetProjectParamsSchema;
  }

  /**
   * Extend auto-generated definition with title/outputSchema/annotations
   * (пакет 3.1.C.ticktick — не выводятся автоматически из METADATA, см.
   * base-tool.ts getDefinition()).
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Get Project',
      outputSchema: GET_PROJECT_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId, fields } = validation.data;

    try {
      this.logger.info('Получение проекта', { projectId });

      const project = await this.facade.getProject(projectId);

      this.logger.info('Проект получен', {
        projectId,
        name: project.name,
      });

      const filtered = ResponseFieldFilter.filter<ProjectWithUnknownFields>(project, fields);

      return this.formatSuccess({
        project: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении проекта', error);
    }
  }
}
