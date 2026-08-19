/**
 * Метаданные для UploadAttachmentTool
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
import { UploadAttachmentOutputSchema } from './upload-attachment.schema.js';

/**
 * Статические метаданные для UploadAttachmentTool
 */
export const UPLOAD_ATTACHMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('upload_attachment', MCP_TOOL_PREFIX),
  description: '[Issues/Attachments] Загрузить файл в задачу (attachment, file, upload)',
  category: ToolCategory.ISSUES,
  subcategory: 'attachments',
  priority: ToolPriority.HIGH,
  tags: ['attachments', 'write', 'upload', 'files'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['issueId', 'mimetype', 'fields'],
  title: 'Загрузить файл в задачу',
  outputSchema: UploadAttachmentOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
