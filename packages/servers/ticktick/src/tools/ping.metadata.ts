/**
 * Метаданные для PingTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для PingTool
 */
export const PING_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('ping', MCP_TOOL_PREFIX),
  description: '[System/Health] Проверка подключения к TickTick API',
  category: ToolCategory.SYSTEM,
  subcategory: 'health',
  priority: ToolPriority.CRITICAL,
  tags: ['ping', 'health', 'status', 'system'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
