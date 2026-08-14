/**
 * Метаданные для GetSprintsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetSprintsOutputSchema } from './get-sprints.schema.js';

export const GET_SPRINTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_sprints', MCP_TOOL_PREFIX),
  description: '[Sprints/Read] Получить список спринтов доски',
  category: ToolCategory.SPRINTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['sprints', 'list', 'read', 'agile', 'board'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['boardId', 'fields'],
  title: 'Спринты доски',
  outputSchema: GetSprintsOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
