/**
 * Метаданные для DemoTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для DemoTool
 */
export const DEMO_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('demo', MCP_TOOL_PREFIX),
  description: '[Helpers/Demo] Тестовый инструмент',
  category: ToolCategory.HELPERS,
  subcategory: 'demo',
  priority: ToolPriority.LOW,
  tags: ['demo', 'example', 'test'],
  isHelper: true,
  requiresExplicitUserConsent: false,
} as const;
