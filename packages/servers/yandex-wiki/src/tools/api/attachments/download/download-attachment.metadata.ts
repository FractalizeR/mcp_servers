import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DownloadAttachmentOutputDataSchema } from './download-attachment.schema.js';

export const DOWNLOAD_ATTACHMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('download_attachment', MCP_TOOL_PREFIX),
  description:
    '[Resources/Read] Скачать содержимое вложения страницы ' +
    '(GET /pages/{id}/attachments/{file_id}/download). file_id — см. yw_get_resources с ' +
    'types=["attachment"]. Без saveToPath содержимое возвращается как base64 в ответе — для ' +
    'больших файлов это дорого по контексту, предпочитайте saveToPath.',
  category: ToolCategory.RESOURCES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['read', 'download', 'attachments', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'file_id'],
  title: 'Скачать вложение',
  outputSchema: buildOutputSchema(DownloadAttachmentOutputDataSchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
