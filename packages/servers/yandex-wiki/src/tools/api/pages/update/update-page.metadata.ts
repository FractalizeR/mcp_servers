import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdatePageOutputDataSchema } from './update-page.schema.js';

export const UPDATE_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_page', MCP_TOOL_PREFIX),
  description:
    '[Pages/Write] Обновить страницу Wiki. content заменяет содержимое ПОЛНОСТЬЮ — ' +
    'ПЕРЕД вызовом с content сначала вызовите yw_diff_page, чтобы увидеть, что реально изменится: recovery_token у update_page нет',
  category: ToolCategory.PAGES,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['write', 'update', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'redirect', 'allow_merge', 'fields', 'is_silent'],
  title: 'Обновить страницу',
  outputSchema: buildOutputSchema(UpdatePageOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
