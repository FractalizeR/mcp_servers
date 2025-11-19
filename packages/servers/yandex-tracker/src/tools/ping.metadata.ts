/**
 * Метаданные для Ping Tool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - ping.definition.ts импортирует metadata (не tool)
 * - ping.tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../constants.js';

/**
 * Статические метаданные для Ping Tool
 */
export const PING_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('ping', MCP_TOOL_PREFIX),
  description: '[System/Health] Проверка доступности сервера',
  category: ToolCategory.SYSTEM,
  subcategory: 'health',
  priority: ToolPriority.NORMAL,
  tags: ['ping', 'health', 'status'],
  isHelper: false,
} as const;
