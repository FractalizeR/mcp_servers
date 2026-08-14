/**
 * Метаданные для GetSprintTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetSprintOutputSchema } from './get-sprint.schema.js';

export const GET_SPRINT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_sprint', MCP_TOOL_PREFIX),
  description: '[Sprints/Read] Получить параметры спринта',
  category: ToolCategory.SPRINTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['sprint', 'read', 'details', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['sprintId', 'fields'],
  title: 'Параметры спринта',
  outputSchema: GetSprintOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
