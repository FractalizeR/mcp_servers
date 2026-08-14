/**
 * MCP Tool for deleting a TickTick project
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import { DELETE_PROJECT_TOOL_METADATA } from './delete-project.metadata.js';
import {
  DeleteProjectParamsSchema,
  DELETE_PROJECT_OUTPUT_SCHEMA,
} from './delete-project.schema.js';

export class DeleteProjectTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = DELETE_PROJECT_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof DeleteProjectParamsSchema {
    return DeleteProjectParamsSchema;
  }

  /**
   * Extend auto-generated definition with title/outputSchema/annotations
   * (пакет 3.1.C.ticktick — не выводятся автоматически из METADATA, см.
   * base-tool.ts getDefinition()).
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Delete Project',
      outputSchema: DELETE_PROJECT_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId } = validation.data;

    try {
      this.logger.info('Удаление проекта', { projectId });

      // Get project name for confirmation message
      const project = await this.facade.getProject(projectId);
      const projectName = project.name;

      await this.facade.deleteProject(projectId);

      this.logger.info('Проект удалён', {
        projectId,
        name: projectName,
      });

      return this.formatSuccess({
        message: `Проект "${projectName}" удалён`,
        deletedProjectId: projectId,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при удалении проекта', error);
    }
  }
}
