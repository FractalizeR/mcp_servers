/**
 * Метаданные для GetPrioritiesTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetPrioritiesOutputSchema } from './get-priorities.schema.js';

export const GET_PRIORITIES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_priorities', MCP_TOOL_PREFIX),
  description: '[Administration/Read] Справочник приоритетов (для create_issue.priority)',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'priorities', 'reference', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['fields'],
  title: 'Приоритеты задач',
  outputSchema: GetPrioritiesOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
