/**
 * Метаданные для ManageQueueAccessTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { ManageQueueAccessOutputSchema } from './manage-queue-access.schema.js';

/**
 * Статические метаданные для ManageQueueAccessTool
 */
export const MANAGE_QUEUE_ACCESS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('manage_queue_access', MCP_TOOL_PREFIX),
  description: '[Queues/Write] Управление доступом к очереди (queue, permissions, access, grant)',
  category: ToolCategory.QUEUES,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['queue', 'access', 'permissions', 'write'],
  isHelper: false,
  // Обязана совпадать с annotations.destructiveHint — проверяется машинно
  // (`scripts/validate-tool-registration.ts`). `action: 'remove'`/`permission: 'deny'`
  // делают эффект необратимым без повторного назначения — ровно тот случай.
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['queueId', 'permission', 'subjectKind', 'action', 'subjects', 'fields'],
  title: 'Управление доступом к очереди',
  outputSchema: ManageQueueAccessOutputSchema,
  annotations: {
    readOnlyHint: false,
    // `action: 'remove'` и `permission: 'deny'` отзывают доступ — эффект необратим
    // без повторного назначения тем же вызывающим, ровно как у прочих
    // разрушительных write-инструментов сервера.
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
