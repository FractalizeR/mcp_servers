/**
 * MCP Tool for updating an existing TickTick project
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { UpdateProjectDto } from '#ticktick_api/dto/project.dto.js';
import { UPDATE_PROJECT_TOOL_METADATA } from './update-project.metadata.js';
import { UpdateProjectParamsSchema } from './update-project.schema.js';

export class UpdateProjectTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = UPDATE_PROJECT_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof UpdateProjectParamsSchema {
    return UpdateProjectParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId, name, color, viewMode, closed, fields } = validation.data;

    try {
      this.logger.info('Обновление проекта', { projectId, name, color, viewMode, closed });

      // Build DTO without undefined properties (exactOptionalPropertyTypes compliance)
      const dto: UpdateProjectDto = {};
      if (name !== undefined) dto.name = name;
      if (color !== undefined) dto.color = color;
      if (viewMode !== undefined) dto.viewMode = viewMode;
      if (closed !== undefined) dto.closed = closed;

      const project = await this.facade.updateProject(projectId, dto);

      this.logger.info('Проект обновлён', {
        projectId: project.id,
        name: project.name,
      });

      const result = fields
        ? ResponseFieldFilter.filter<ProjectWithUnknownFields>(project, fields)
        : project;

      return this.formatSuccess({
        message: 'Проект обновлён',
        project: result,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при обновлении проекта', error);
    }
  }
}
