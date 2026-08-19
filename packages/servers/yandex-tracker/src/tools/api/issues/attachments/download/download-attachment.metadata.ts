/**
 * Метаданные для DownloadAttachmentTool
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
import { DownloadAttachmentOutputSchema } from './download-attachment.schema.js';

/**
 * Статические метаданные для DownloadAttachmentTool
 */
export const DOWNLOAD_ATTACHMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('download_attachment', MCP_TOOL_PREFIX),
  description: '[Issues/Attachments] Скачать файл из задачи (attachment, file, download)',
  category: ToolCategory.ISSUES,
  subcategory: 'attachments',
  priority: ToolPriority.HIGH,
  tags: ['attachments', 'read', 'download', 'files'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['issueId', 'attachmentId'],
  title: 'Скачать файл из задачи',
  outputSchema: DownloadAttachmentOutputSchema,
  // readOnlyHint: false (пакет 3.1.G) — спорная классификация пакета 3.1.C.tracker
  // исправлена: readOnlyHint в спеке MCP означает «не меняет своё окружение», а
  // `saveToPath` пишет файл на диск пользователя — это меняет окружение клиента,
  // даже если состояние самого Трекера не затрагивается. Клиент, доверяющий
  // аннотации, мог бы авто-одобрить запись на диск без подтверждения.
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
