/**
 * Метаданные для ManageSprintLifecycleTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { ManageSprintLifecycleOutputSchema } from './manage-sprint-lifecycle.schema.js';

/**
 * `destructiveHint: true` — статический флаг охватывает худший из трёх
 * возможных action (`delete`, необратим); start/archive обратимы, но MCP
 * annotations не различают действия внутри одного инструмента.
 */
export const MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('manage_sprint_lifecycle', MCP_TOOL_PREFIX),
  description: '[Sprints/Write] Старт / архивация / удаление спринта',
  category: ToolCategory.SPRINTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['sprint', 'lifecycle', 'start', 'archive', 'delete', 'write', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['sprintId', 'action', 'version', 'fields'],
  title: 'Жизненный цикл спринта',
  outputSchema: ManageSprintLifecycleOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
