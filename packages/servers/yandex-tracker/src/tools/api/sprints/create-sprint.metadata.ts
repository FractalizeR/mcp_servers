/**
 * Метаданные для CreateSprintTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateSprintOutputSchema } from './create-sprint.schema.js';

export const CREATE_SPRINT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_sprint', MCP_TOOL_PREFIX),
  description: '[Sprints/Write] Создать спринт',
  category: ToolCategory.SPRINTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['sprint', 'create', 'write', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'board',
    'startDate',
    'endDate',
    'startDateTime',
    'endDateTime',
    'status',
    'fields',
  ],
  title: 'Создать спринт',
  outputSchema: CreateSprintOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
