/**
 * MCP Tool for creating a new TickTick project
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { CreateProjectDto } from '#ticktick_api/dto/project.dto.js';
import { CREATE_PROJECT_TOOL_METADATA } from './create-project.metadata.js';
import { CreateProjectParamsSchema } from './create-project.schema.js';

export class CreateProjectTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = CREATE_PROJECT_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof CreateProjectParamsSchema {
    return CreateProjectParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateProjectParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { name, color, viewMode, kind, fields } = validation.data;

    try {
      this.logger.info('Создание проекта', { name, color, viewMode, kind });

      // Build DTO without undefined properties (exactOptionalPropertyTypes compliance)
      const dto: CreateProjectDto = { name };
      if (color !== undefined) dto.color = color;
      if (viewMode !== undefined) dto.viewMode = viewMode;
      if (kind !== undefined) dto.kind = kind;

      const project = await this.facade.createProject(dto);

      this.logger.info('Проект создан', {
        projectId: project.id,
        name: project.name,
      });

      const result = fields
        ? ResponseFieldFilter.filter<ProjectWithUnknownFields>(project, fields)
        : project;

      return this.formatSuccess({
        message: `Проект "${name}" создан`,
        project: result,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при создании проекта', error);
    }
  }
}
