import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_PAGE_BY_ID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_page_by_id', MCP_TOOL_PREFIX),
  description: '[Pages/Read] Получить страницу Wiki по ID',
  category: ToolCategory.PAGES,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['read', 'get', 'page', 'wiki', 'id'],
  isHelper: false,
} as const;
