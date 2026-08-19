import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { MAX_ATTACHMENT_SIZE } from '#constants';
import { UploadAttachmentOutputDataSchema } from './upload-attachment.schema.js';

export const UPLOAD_ATTACHMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('upload_attachment', MCP_TOOL_PREFIX),
  description:
    '[Resources/Write] Загрузить файл и прикрепить его к странице. ' +
    'Wiki API не принимает файл напрямую — эндпоинт устроен как Upload Session (создание ' +
    'сессии, загрузка части, завершение, привязка к странице); инструмент проводит файл через ' +
    'всю цепочку одним ' +
    `вызовом. Ограничение размера: ${MAX_ATTACHMENT_SIZE} байт (10 МБ) после декодирования ` +
    'base64 — для больших файлов инструмент не подходит.',
  category: ToolCategory.RESOURCES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'create', 'upload', 'attachments', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx'],
  title: 'Загрузить вложение',
  outputSchema: buildOutputSchema(UploadAttachmentOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
