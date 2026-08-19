/**
 * Metadata for CompleteTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { COMPLETE_TASK_OUTPUT_SCHEMA } from './complete-task.schema.js';

/**
 * Static metadata for CompleteTaskTool
 */
export const COMPLETE_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('complete_task', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Отметить задачу выполненной (task, todo, complete, done, finish)',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['task', 'complete', 'done', 'finish'],
  isHelper: false,
  // Решение владельца (2026-08-14): requiresExplicitUserConsent обязан
  // совпадать с annotations.destructiveHint. complete_task переводит задачу
  // в терминальный статус (completed=2); update_task НЕ принимает параметр
  // status (см. UpdateTaskParamsSchema) — среди доступных tools нет способа
  // отменить завершение. Необратимо доступными средствами → разрушающая
  // операция: оба флага true (было consent=true/destructiveHint=false —
  // расхождение).
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['projectId', 'taskId'],
  title: 'Завершить задачу',
  outputSchema: COMPLETE_TASK_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
