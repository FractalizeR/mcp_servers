/**
 * Метаданные для CreateBoardTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateBoardOutputSchema } from './create-board.schema.js';

/**
 * Статические метаданные для CreateBoardTool
 */
export const CREATE_BOARD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_board', MCP_TOOL_PREFIX),
  description: '[Boards/Write] Создать доску (board, kanban, create)',
  category: ToolCategory.BOARDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['board', 'create', 'write', 'agile'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['queue', 'orderAsc', 'useRanking', 'country', 'fields'],
  title: 'Создать доску',
  outputSchema: CreateBoardOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
