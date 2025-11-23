/**
 * Метаданные для CreateLinkTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для CreateLinkTool
 */
export const CREATE_LINK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_link', MCP_TOOL_PREFIX),
  description:
    '[Issues/Links] Создать связи между задачами. ' +
    'Batch-режим: каждая связь может иметь свои параметры (issueId, relationship, targetIssue). ' +
    'Возвращает unified batch result format.',
  category: ToolCategory.ISSUES,
  subcategory: 'links',
  priority: ToolPriority.HIGH,
  tags: ['links', 'write', 'create', 'relationships', 'subtasks', 'batch'],
  isHelper: false,
} as const;
