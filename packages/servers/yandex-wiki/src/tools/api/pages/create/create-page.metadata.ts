import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const CREATE_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_page', MCP_TOOL_PREFIX),
  description: '[Pages/Write] Создать новую страницу Wiki',
  category: ToolCategory.PAGES,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['write', 'create', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
