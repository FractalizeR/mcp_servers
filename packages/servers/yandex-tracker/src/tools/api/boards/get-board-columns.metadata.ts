/**
 * Метаданные для GetBoardColumnsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetBoardColumnsOutputSchema } from './get-board-columns.schema.js';

export const GET_BOARD_COLUMNS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_board_columns', MCP_TOOL_PREFIX),
  description: '[Boards/Read] Получить список колонок доски',
  category: ToolCategory.BOARDS,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['board', 'columns', 'read', 'agile', 'kanban'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['boardId', 'fields'],
  title: 'Колонки доски',
  outputSchema: GetBoardColumnsOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
