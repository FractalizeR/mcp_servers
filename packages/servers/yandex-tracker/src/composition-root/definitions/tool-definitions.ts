/**
 * Определения всех MCP Tools
 *
 * ВАЖНО: При добавлении нового Tool:
 * 1. Импортируй класс Tool
 * 2. Добавь его в массив TOOL_CLASSES
 * 3. Всё остальное произойдёт автоматически (DI регистрация, ToolRegistry)
 */

import { PingTool } from '@tools/ping.tool.js';
import { GetIssuesTool } from '@tools/api/issues/get/index.js';
import { CreateIssueTool } from '@tools/api/issues/create/index.js';
import { FindIssuesTool } from '@tools/api/issues/find/index.js';
import { UpdateIssueTool } from '@tools/api/issues/update/index.js';
import { GetIssueChangelogTool } from '@tools/api/issues/changelog/index.js';
import { GetIssueTransitionsTool } from '@tools/api/issues/transitions/get/index.js';
import { TransitionIssueTool } from '@tools/api/issues/transitions/execute/index.js';
import {
  GetQueuesTool,
  GetQueueTool,
  CreateQueueTool,
  UpdateQueueTool,
  GetQueueFieldsTool,
  ManageQueueAccessTool,
} from '@tools/api/queues/index.js';
import { GetIssueLinksTool } from '@tools/api/issues/links/get/index.js';
import { CreateLinkTool } from '@tools/api/issues/links/create/index.js';
import { DeleteLinkTool } from '@tools/api/issues/links/delete/index.js';
import { AddCommentTool } from '@tools/api/comments/add/index.js';
import { GetCommentsTool } from '@tools/api/comments/get/index.js';
import { EditCommentTool } from '@tools/api/comments/edit/index.js';
import { DeleteCommentTool } from '@tools/api/comments/delete/index.js';
import { GetAttachmentsTool } from '@tools/api/issues/attachments/get/index.js';
import { UploadAttachmentTool } from '@tools/api/issues/attachments/upload/index.js';
import { DownloadAttachmentTool } from '@tools/api/issues/attachments/download/index.js';
import { DeleteAttachmentTool } from '@tools/api/issues/attachments/delete/index.js';
import { GetThumbnailTool } from '@tools/api/issues/attachments/thumbnail/index.js';
import { IssueUrlTool } from '@tools/helpers/issue-url/index.js';
import { DemoTool } from '@tools/helpers/demo/index.js';

/**
 * Массив всех Tool классов в проекте
 *
 * КОНВЕНЦИЯ ИМЕНОВАНИЯ:
 * - Класс ДОЛЖЕН заканчиваться на "Tool"
 * - Symbol автоматически создаётся как Symbol.for(ClassName)
 * - Пример: PingTool → Symbol.for('PingTool')
 *
 * ДОБАВЛЕНИЕ НОВОГО TOOL:
 * 1. Импортируй класс
 * 2. Добавь в массив TOOL_CLASSES
 * 3. ВСЁ! (DI регистрация, ToolRegistry, TYPES — автоматически)
 *
 * ПРИМЕЧАНИЕ: SearchToolsTool регистрируется отдельно через container.ts,
 * так как имеет другой конструктор: (searchEngine, logger) вместо (facade, logger)
 */
export const TOOL_CLASSES = [
  PingTool,
  GetIssuesTool,
  CreateIssueTool,
  FindIssuesTool,
  UpdateIssueTool,
  GetIssueChangelogTool,
  GetIssueTransitionsTool,
  TransitionIssueTool,
  GetQueuesTool,
  GetQueueTool,
  CreateQueueTool,
  UpdateQueueTool,
  GetQueueFieldsTool,
  ManageQueueAccessTool,
  GetIssueLinksTool,
  CreateLinkTool,
  DeleteLinkTool,
  AddCommentTool,
  GetCommentsTool,
  EditCommentTool,
  DeleteCommentTool,
  GetAttachmentsTool,
  UploadAttachmentTool,
  DownloadAttachmentTool,
  DeleteAttachmentTool,
  GetThumbnailTool,
  IssueUrlTool,
  DemoTool,
] as const;

/**
 * Тип для Tool классов (type-safe)
 */
export type ToolClass = (typeof TOOL_CLASSES)[number];
