import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { AppendContentOutputDataSchema } from './append-content.schema.js';

export const APPEND_CONTENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('append_content', MCP_TOOL_PREFIX),
  description: '[Pages/Write] Добавить контент к странице Wiki',
  category: ToolCategory.PAGES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'append', 'add', 'content', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: [
    'idx',
    'body_location',
    'section_id',
    'section_location',
    'anchor_fallback',
    'anchor_regex',
    'is_silent',
    'fields',
  ],
  title: 'Добавить контент к странице',
  outputSchema: buildOutputSchema(AppendContentOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
