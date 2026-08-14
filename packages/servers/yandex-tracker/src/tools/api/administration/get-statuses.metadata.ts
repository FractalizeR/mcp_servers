/**
 * Метаданные для GetStatusesTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetStatusesOutputSchema } from './get-statuses.schema.js';

export const GET_STATUSES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_statuses', MCP_TOOL_PREFIX),
  description: '[Administration/Read] Справочник статусов задач (см. transition_issue)',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'statuses', 'reference', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['fields'],
  title: 'Статусы задач',
  outputSchema: GetStatusesOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
