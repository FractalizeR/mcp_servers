/**
 * Метаданные для RawApiRequestTool
 *
 * Вынесены в отдельный файл для единообразия с другими tools
 * (разрыв возможных циклов schema/tool/metadata).
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для RawApiRequestTool
 *
 * read-only → requiresExplicitUserConsent: false.
 * priority: LOW — это fallback, типизированные tools предпочтительнее.
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
  // path/method — часть имени вызываемого API-эндпоинта, видны и без раскрытия
  // (безопасны как queue/issueId). query/fields не раскрываем — query может
  // нести значения фильтров, введённые агентом.
  redactionAllowlist: ['method', 'path', 'fields'],
} as const;
