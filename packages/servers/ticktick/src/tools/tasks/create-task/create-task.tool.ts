/**
 * MCP Tool for creating a task in TickTick
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import type { CreateTaskDto } from '#ticktick_api/dto/index.js';
import { CreateTaskParamsSchema, CREATE_TASK_OUTPUT_SCHEMA } from './create-task.schema.js';
import { CREATE_TASK_TOOL_METADATA } from './create-task.metadata.js';

/**
 * Tool for creating a new task
 */
export class CreateTaskTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = CREATE_TASK_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof CreateTaskParamsSchema {
    return CreateTaskParamsSchema;
  }

  /**
   * Extend auto-generated definition with title/outputSchema/annotations
   * (пакет 3.1.C.ticktick — не выводятся автоматически из METADATA, см.
   * base-tool.ts getDefinition()).
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Create Task',
      outputSchema: CREATE_TASK_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, CreateTaskParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { title, projectId, content, priority, dueDate, startDate, tags, items, fields } =
      validation.data;

    try {
      // 2. Build DTO (only include defined properties)
      const dto: CreateTaskDto = { title };
      if (projectId !== undefined) dto.projectId = projectId;
      if (content !== undefined) dto.content = content;
      if (priority !== undefined) dto.priority = priority;
      if (dueDate !== undefined) dto.dueDate = dueDate;
      if (startDate !== undefined) dto.startDate = startDate;
      if (tags !== undefined) dto.tags = tags;
      if (items !== undefined) dto.items = items.map((item) => ({ title: item.title }));

      // 3. Create task via facade
      const task = await this.facade.createTask(dto);

      // 4. Apply field filtering if specified
      const result = fields
        ? ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields)
        : task;

      // 5. Log success
      this.logger.info(`Task "${title}" created with id ${task.id}`);

      return this.formatSuccess({
        message: `Task "${title}" created successfully`,
        task: result,
        fieldsReturned: fields ?? ['all'],
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to create task: ${title}`, error);
    }
  }
}
