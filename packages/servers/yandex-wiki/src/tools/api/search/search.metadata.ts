import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildCollectionOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { SearchResultOutputSchema, SearchSummarySchema } from '#common/schemas/index.js';

export const SEARCH_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('search', MCP_TOOL_PREFIX),
  description:
    '[Search] Полнотекстовый поиск по страницам и файлам Wiki (POST /v1/search). ' +
    'Единственный способ найти страницу, не зная заранее её точный slug/id — ' +
    'raw_api_request не подходит (только GET, поиск — POST). Результаты отдаются в ' +
    'режиме ссылок/тел (см. responseMode); ссылка на найденную страницу ведёт на ' +
    'wiki://page/{slug} (полное содержимое читается через resources/read).',
  category: ToolCategory.SEARCH,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['read', 'search', 'wiki', 'fulltext'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['cursor', 'limit', 'order_by', 'highlight', 'responseMode'],
  title: 'Полнотекстовый поиск',
  outputSchema: buildCollectionOutputSchema(SearchResultOutputSchema, SearchSummarySchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    // POST, но читающий (см. `idempotencyDeclared: true` в SearchOperation) —
    // повторный вызов с теми же параметрами не меняет состояние.
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
