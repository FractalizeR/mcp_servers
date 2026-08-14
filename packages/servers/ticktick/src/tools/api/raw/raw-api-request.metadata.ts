/**
 * Метаданные для RawApiRequestTool (TickTick)
 *
 * Вынесены в отдельный файл для единообразия с другими tools.
 *
 * read-only → requiresExplicitUserConsent: false.
 * priority: LOW — это fallback, типизированные tools предпочтительнее.
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { RAW_API_REQUEST_OUTPUT_SCHEMA } from './raw-api-request.schema.js';

/**
 * Статические метаданные для RawApiRequestTool
 */
export const RAW_API_REQUEST_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('raw_api_request', MCP_TOOL_PREFIX),
  description: '[System/Read] GET к API (fallback; предпочитай типизированные tools)',
  category: ToolCategory.SYSTEM,
  subcategory: 'read',
  priority: ToolPriority.LOW,
  tags: ['raw', 'api', 'fallback', 'advanced', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  // Ни один параметр raw-запроса не является чистым идентификатором:
  // path — произвольный маршрут (может нести встроенные ID, но не сам ID),
  // query — открытый набор пар ключ-значение, потенциально с текстом.
  redactionAllowlist: [],
  title: 'Raw API Request',
  outputSchema: RAW_API_REQUEST_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
