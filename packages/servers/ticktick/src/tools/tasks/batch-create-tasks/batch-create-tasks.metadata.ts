/**
 * Metadata for BatchCreateTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { BATCH_CREATE_TASKS_OUTPUT_SCHEMA } from './batch-create-tasks.schema.js';

/**
 * Static metadata for BatchCreateTasksTool
 */
export const BATCH_CREATE_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('batch_create_tasks', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Создать несколько задач за раз (до 50)',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['tasks', 'batch', 'create', 'bulk'],
  isHelper: false,
  // Решение владельца (2026-08-14): requiresExplicitUserConsent обязан
  // совпадать с annotations.destructiveHint. Создание — обратимо удалением
  // (delete_task на каждую созданную задачу), не разрушающая операция.
  // Оба флага false (было consent=true при destructiveHint=false — расхождение).
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['projectId'],
  title: 'Массовое создание задач',
  outputSchema: BATCH_CREATE_TASKS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
