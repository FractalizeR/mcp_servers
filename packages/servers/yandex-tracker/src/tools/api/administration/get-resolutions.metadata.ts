/**
 * Метаданные для GetResolutionsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetResolutionsOutputSchema } from './get-resolutions.schema.js';

export const GET_RESOLUTIONS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_resolutions', MCP_TOOL_PREFIX),
  description: '[Administration/Read] Справочник резолюций (для transition.resolution)',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'resolutions', 'reference', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['fields'],
  title: 'Резолюции задач',
  outputSchema: GetResolutionsOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
