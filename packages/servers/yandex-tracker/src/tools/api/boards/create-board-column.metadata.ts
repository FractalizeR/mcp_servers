/**
 * Метаданные для CreateBoardColumnTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateBoardColumnOutputSchema } from './create-board-column.schema.js';

export const CREATE_BOARD_COLUMN_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_board_column', MCP_TOOL_PREFIX),
  description: '[Boards/Write] Создать колонку доски',
  category: ToolCategory.BOARDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['board', 'columns', 'create', 'write', 'agile', 'kanban'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['boardId', 'statuses', 'fields'],
  title: 'Создать колонку доски',
  outputSchema: CreateBoardColumnOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
