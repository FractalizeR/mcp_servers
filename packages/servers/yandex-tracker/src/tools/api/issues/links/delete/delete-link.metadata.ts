/**
 * Метаданные для DeleteLinkTool
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
import { DeleteLinkOutputSchema } from './delete-link.schema.js';

/**
 * Статические метаданные для DeleteLinkTool
 */
export const DELETE_LINK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_link', MCP_TOOL_PREFIX),
  description: '[Issues/Links] Удалить связь между задачами (link, relation, delete)',
  category: ToolCategory.ISSUES,
  subcategory: 'delete',
  priority: ToolPriority.HIGH,
  tags: ['links', 'write', 'delete', 'remove', 'relationships'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['issueId', 'linkId'],
  title: 'Удалить связь между задачами',
  outputSchema: DeleteLinkOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
