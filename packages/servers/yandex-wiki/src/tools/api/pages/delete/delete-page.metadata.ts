import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const DELETE_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_page', MCP_TOOL_PREFIX),
  description: '[Pages/Delete] Удалить страницу Wiki (возвращает recovery_token)',
  category: ToolCategory.PAGES,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['delete', 'remove', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
