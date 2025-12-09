import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_page', MCP_TOOL_PREFIX),
  description: '[Pages/Read] Получить страницу Wiki по slug',
  category: ToolCategory.PAGES,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['read', 'get', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
