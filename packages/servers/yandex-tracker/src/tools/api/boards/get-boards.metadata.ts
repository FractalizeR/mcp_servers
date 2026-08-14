/**
 * Метаданные для GetBoardsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetBoardsOutputSchema } from './get-boards.schema.js';

/**
 * Статические метаданные для GetBoardsTool
 */
export const GET_BOARDS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_boards', MCP_TOOL_PREFIX),
  description: '[Boards/Read] Получить список досок',
  category: ToolCategory.BOARDS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['boards', 'list', 'read', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['localized', 'fields'],
  title: 'Список досок',
  outputSchema: GetBoardsOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
