import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_RESOURCES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_resources', MCP_TOOL_PREFIX),
  description: '[Resources/Read] Получить ресурсы страницы (вложения, таблицы)',
  category: ToolCategory.RESOURCES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['read', 'get', 'resources', 'attachments', 'grids'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
