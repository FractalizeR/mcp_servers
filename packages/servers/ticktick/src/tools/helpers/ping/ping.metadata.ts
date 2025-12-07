/**
 * Metadata for PingTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const PING_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('ping', MCP_TOOL_PREFIX),
  description: '[Helpers] Проверить подключение к TickTick API.',
  category: ToolCategory.HELPERS,
  priority: ToolPriority.CRITICAL,
  tags: ['ping', 'health', 'status', 'test'],
  isHelper: true,
} as const;
