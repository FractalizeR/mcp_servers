/**
 * Метаданные для SearchWorklogTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { SearchWorklogOutputSchema } from './search-worklog.schema.js';

export const SEARCH_WORKLOG_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('search_worklog', MCP_TOOL_PREFIX),
  description: '[Worklog/Read] Поиск записей времени по всей организации (автор/даты)',
  category: ToolCategory.ISSUES,
  subcategory: 'worklog',
  priority: ToolPriority.HIGH,
  tags: ['worklog', 'search', 'read', 'report', 'time-tracking', 'organization'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'createdBy',
    'createdAtFrom',
    'createdAtTo',
    'perPage',
    'cursor',
    'fetchAll',
    'maxItems',
    'fields',
  ],
  title: 'Поиск worklog по организации',
  outputSchema: SearchWorklogOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
