/**
 * Метаданные для PingTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { PING_OUTPUT_SCHEMA } from './ping.schema.js';

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
  redactionAllowlist: [],
  title: 'Ping',
  outputSchema: PING_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
