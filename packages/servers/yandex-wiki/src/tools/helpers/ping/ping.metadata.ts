import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const PING_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('ping', MCP_TOOL_PREFIX),
  description: '[System] Проверка подключения к Yandex Wiki API',
  category: ToolCategory.SYSTEM,
  priority: ToolPriority.CRITICAL,
  tags: ['system', 'ping', 'health', 'check'],
  isHelper: true,
} as const;
