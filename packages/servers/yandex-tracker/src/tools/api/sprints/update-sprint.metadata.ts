/**
 * Метаданные для UpdateSprintTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateSprintOutputSchema } from './update-sprint.schema.js';

export const UPDATE_SPRINT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_sprint', MCP_TOOL_PREFIX),
  description: '[Sprints/Write] Обновить спринт (название/даты/статус)',
  category: ToolCategory.SPRINTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['sprint', 'update', 'write', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: [
    'sprintId',
    'version',
    'startDate',
    'endDate',
    'startDateTime',
    'endDateTime',
    'status',
    'fields',
  ],
  title: 'Обновить спринт',
  outputSchema: UpdateSprintOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
