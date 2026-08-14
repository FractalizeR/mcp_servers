/**
 * Метаданные для GetBoardTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetBoardOutputSchema } from './get-board.schema.js';

/**
 * Статические метаданные для GetBoardTool
 */
export const GET_BOARD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_board', MCP_TOOL_PREFIX),
  description: '[Boards/Read] Получить параметры доски',
  category: ToolCategory.BOARDS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['board', 'read', 'details', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['boardId', 'localized', 'fields'],
  title: 'Параметры доски',
  outputSchema: GetBoardOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
