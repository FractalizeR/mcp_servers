/**
 * Метаданные для DeleteBoardColumnTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DeleteBoardColumnOutputSchema } from './delete-board-column.schema.js';

export const DELETE_BOARD_COLUMN_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_board_column', MCP_TOOL_PREFIX),
  description: '[Boards/Write] Удалить колонку доски',
  category: ToolCategory.BOARDS,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['board', 'columns', 'delete', 'write', 'remove', 'agile', 'kanban'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['boardId', 'columnId'],
  title: 'Удалить колонку доски',
  outputSchema: DeleteBoardColumnOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
