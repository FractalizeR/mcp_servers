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
  // path/method — часть имени вызываемого API-эндпоинта, видны и без
  // раскрытия (безопасны как projectId/taskId в других tools). query не
  // раскрываем — открытый набор пар ключ-значение, потенциально с текстом
  // (совпадает с tracker/wiki raw-api-request — L6 отчёта ревью).
  redactionAllowlist: ['method', 'path', 'fields'],
  title: 'Прямой запрос к API TickTick (GET)',
  outputSchema: RAW_API_REQUEST_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
