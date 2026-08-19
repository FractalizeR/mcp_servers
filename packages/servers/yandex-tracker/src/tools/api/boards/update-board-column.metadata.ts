/**
 * Метаданные для UpdateBoardColumnTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateBoardColumnOutputSchema } from './update-board-column.schema.js';

export const UPDATE_BOARD_COLUMN_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_board_column', MCP_TOOL_PREFIX),
  description: '[Boards/Write] Обновить колонку доски (board, column, kanban, edit, update)',
  category: ToolCategory.BOARDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['board', 'columns', 'update', 'write', 'agile', 'kanban'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['boardId', 'columnId', 'statuses', 'limit', 'fields'],
  title: 'Обновить колонку доски',
  outputSchema: UpdateBoardColumnOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
