/**
 * Метаданные для UpdateBoardTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateBoardOutputSchema } from './update-board.schema.js';

/**
 * Статические метаданные для UpdateBoardTool
 */
export const UPDATE_BOARD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_board', MCP_TOOL_PREFIX),
  description: '[Boards/Write] Обновить доску',
  category: ToolCategory.BOARDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['board', 'update', 'write', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['boardId', 'version', 'orderAsc', 'useRanking', 'country', 'fields'],
  title: 'Обновить доску',
  outputSchema: UpdateBoardOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
