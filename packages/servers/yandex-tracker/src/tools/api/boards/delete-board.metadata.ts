/**
 * Метаданные для DeleteBoardTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DeleteBoardOutputSchema } from './delete-board.schema.js';

/**
 * Статические метаданные для DeleteBoardTool
 */
export const DELETE_BOARD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_board', MCP_TOOL_PREFIX),
  description: '[Boards/Write] Удалить доску',
  category: ToolCategory.BOARDS,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['board', 'delete', 'write', 'remove', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['boardId'],
  title: 'Удалить доску',
  outputSchema: DeleteBoardOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
