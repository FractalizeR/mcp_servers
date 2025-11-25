import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const APPEND_CONTENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('append_content', MCP_TOOL_PREFIX),
  description: '[Pages/Write] Добавить контент к странице Wiki',
  category: ToolCategory.PAGES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'append', 'add', 'content', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
