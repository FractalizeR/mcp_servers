/**
 * Метаданные для PingTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для PingTool
 */
export const PING_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('ping', MCP_TOOL_PREFIX),
  description: '[System/Health] Проверка подключения к Yandex Wiki API',
  category: ToolCategory.SYSTEM,
  subcategory: 'health',
  priority: ToolPriority.CRITICAL,
  tags: ['ping', 'health', 'status', 'system'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
