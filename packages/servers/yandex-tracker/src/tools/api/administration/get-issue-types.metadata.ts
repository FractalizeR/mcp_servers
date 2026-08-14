/**
 * Метаданные для GetIssueTypesTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetIssueTypesOutputSchema } from './get-issue-types.schema.js';

export const GET_ISSUE_TYPES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_issue_types', MCP_TOOL_PREFIX),
  description: '[Administration/Read] Справочник типов задач (для create_issue.type)',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'issue-types', 'reference', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['fields'],
  title: 'Типы задач',
  outputSchema: GetIssueTypesOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
