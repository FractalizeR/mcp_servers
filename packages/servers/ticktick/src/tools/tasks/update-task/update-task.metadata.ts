/**
 * Metadata for UpdateTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UPDATE_TASK_OUTPUT_SCHEMA } from './update-task.schema.js';

/**
 * Static metadata for UpdateTaskTool
 */
export const UPDATE_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_task', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Обновить существующую задачу',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['task', 'update', 'edit', 'modify'],
  isHelper: false,
  // Решение владельца (2026-08-14): requiresExplicitUserConsent обязан
  // совпадать с annotations.destructiveHint. update_task переписывает
  // отдельные поля (title/content/priority/dueDate/tags) — обратимо
  // повторным вызовом с прежними значениями, данные не теряются
  // безвозвратно, в отличие от удаления или полной перезаписи без пути
  // отката. Поэтому НЕ разрушающая операция: оба флага false (было true/true).
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['projectId', 'taskId'],
  title: 'Обновить задачу',
  outputSchema: UPDATE_TASK_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
