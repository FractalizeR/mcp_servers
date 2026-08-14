import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildCollectionOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { PageDescendantOutputSchema, DescendantsSummarySchema } from '#common/schemas/index.js';

export const GET_DESCENDANTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_descendants', MCP_TOOL_PREFIX),
  description:
    '[Pages/Read] Обойти поддерево раздела по slug родительской страницы ' +
    '(GET /pages/descendants) — единственный документированный способ пройти структуру ' +
    'раздела целиком (все уровни, не только первый), с пагинацией и фильтром актуальности. ' +
    'Каждый элемент — ссылка на wiki://page/{slug} (полное содержимое читается через ' +
    'resources/read).',
  category: ToolCategory.PAGES,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['read', 'pages', 'wiki', 'descendants', 'tree'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'slug',
    'actuality',
    'cursor',
    'include_self',
    'page_size',
    'show_all',
    'responseMode',
  ],
  title: 'Обойти поддерево раздела (по slug)',
  outputSchema: buildCollectionOutputSchema(PageDescendantOutputSchema, DescendantsSummarySchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
