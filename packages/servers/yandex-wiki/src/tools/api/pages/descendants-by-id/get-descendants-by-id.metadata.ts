import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildCollectionOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { PageDescendantOutputSchema, DescendantsSummarySchema } from '#common/schemas/index.js';

export const GET_DESCENDANTS_BY_ID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_descendants_by_id', MCP_TOOL_PREFIX),
  description:
    '[Pages/Read] Обойти поддерево раздела по ID родительской страницы ' +
    '(GET /pages/{id}/descendants) — тот же обход, что и yw_get_descendants, но по числовому ' +
    'ID вместо slug. Каждый элемент — ссылка на wiki://page/{slug} (полное содержимое читается ' +
    'через resources/read).',
  category: ToolCategory.PAGES,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['read', 'pages', 'wiki', 'descendants', 'tree', 'id'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'idx',
    'actuality',
    'cursor',
    'include_self',
    'page_size',
    'show_all',
    'responseMode',
  ],
  title: 'Обойти поддерево раздела (по ID)',
  outputSchema: buildCollectionOutputSchema(PageDescendantOutputSchema, DescendantsSummarySchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
