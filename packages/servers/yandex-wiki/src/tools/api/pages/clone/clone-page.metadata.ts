import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const CLONE_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('clone_page', MCP_TOOL_PREFIX),
  description: '[Pages/Write] Клонировать страницу Wiki (асинхронная операция)',
  category: ToolCategory.PAGES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'clone', 'copy', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
