/**
 * MCP Tool for batch creating tasks in TickTick
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import type { CreateTaskDto } from '#ticktick_api/dto/index.js';
import { BatchCreateTasksParamsSchema } from './batch-create-tasks.schema.js';
import { BATCH_CREATE_TASKS_TOOL_METADATA } from './batch-create-tasks.metadata.js';

/**
 * Tool for creating multiple tasks at once
 */
export class BatchCreateTasksTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = BATCH_CREATE_TASKS_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof BatchCreateTasksParamsSchema {
    return BatchCreateTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, BatchCreateTasksParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { tasks, fields } = validation.data;

    try {
      // 2. Build DTOs (only include defined properties)
      const dtos: CreateTaskDto[] = tasks.map((task) => {
        const dto: CreateTaskDto = { title: task.title };
        if (task.projectId !== undefined) dto.projectId = task.projectId;
        if (task.content !== undefined) dto.content = task.content;
        if (task.priority !== undefined) dto.priority = task.priority;
        if (task.dueDate !== undefined) dto.dueDate = task.dueDate;
        return dto;
      });

      // 3. Batch create tasks via facade
      const result = await this.facade.batchCreateTasks(dtos);

      // 4. Apply field filtering if specified
      const successfulTasks = fields
        ? result.successful.map((task) =>
            ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields)
          )
        : result.successful;

      // 5. Log success
      this.logger.info(
        `Batch created: ${result.successful.length} successful, ${result.failed.length} failed`
      );

      return this.formatSuccess({
        total: tasks.length,
        successful: result.successful.length,
        failed: result.failed.length,
        tasks: successfulTasks,
        errors: result.failed,
        fieldsReturned: fields ?? ['all'],
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to batch create ${tasks.length} tasks`, error);
    }
  }
}
