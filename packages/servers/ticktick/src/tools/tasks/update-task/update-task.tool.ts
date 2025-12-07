/**
 * MCP Tool for updating a task in TickTick
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import type { UpdateTaskDto } from '#ticktick_api/dto/index.js';
import { UpdateTaskParamsSchema } from './update-task.schema.js';
import { UPDATE_TASK_TOOL_METADATA } from './update-task.metadata.js';

/**
 * Tool for updating an existing task
 */
export class UpdateTaskTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = UPDATE_TASK_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof UpdateTaskParamsSchema {
    return UpdateTaskParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, UpdateTaskParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId, taskId, title, content, priority, dueDate, tags, fields } = validation.data;

    try {
      // 2. Build DTO (only include provided fields)
      const dto: UpdateTaskDto = {};
      if (title !== undefined) dto.title = title;
      if (content !== undefined) dto.content = content;
      if (priority !== undefined) dto.priority = priority;
      if (dueDate !== undefined && dueDate !== null) dto.dueDate = dueDate;
      if (tags !== undefined) dto.tags = tags;

      // 3. Update task via facade
      const task = await this.facade.updateTask(projectId, taskId, dto);

      // 4. Apply field filtering if specified
      const result = fields
        ? ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields)
        : task;

      // 5. Log success
      this.logger.info(`Task ${taskId} updated`);

      return this.formatSuccess({
        message: `Task ${taskId} updated successfully`,
        task: result,
        fieldsReturned: fields ?? ['all'],
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to update task ${taskId}`, error);
    }
  }
}
