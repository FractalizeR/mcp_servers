/**
 * Определения всех MCP Tools
 *
 * ВАЖНО: При добавлении нового Tool:
 * 1. Импортируй класс Tool
 * 2. Добавь его в массив TOOL_CLASSES
 * 3. Всё остальное произойдёт автоматически (DI регистрация, ToolRegistry)
 */

import { PingTool } from '#tools/ping.tool.js';
import { GetIssuesTool } from '#tools/api/issues/get/index.js';
import { CreateIssueTool } from '#tools/api/issues/create/index.js';
import { FindIssuesTool } from '#tools/api/issues/find/index.js';
import { UpdateIssueTool } from '#tools/api/issues/update/index.js';
import { GetIssueChangelogTool } from '#tools/api/issues/changelog/index.js';
import { GetIssueTransitionsTool } from '#tools/api/issues/transitions/get/index.js';
import { TransitionIssueTool } from '#tools/api/issues/transitions/execute/index.js';
import {
  GetQueuesTool,
  GetQueueTool,
  CreateQueueTool,
  UpdateQueueTool,
  GetQueueFieldsTool,
  ManageQueueAccessTool,
} from '#tools/api/queues/index.js';
import {
  GetComponentsTool,
  CreateComponentTool,
  UpdateComponentTool,
  DeleteComponentTool,
} from '#tools/api/components/index.js';
import { GetIssueLinksTool } from '#tools/api/issues/links/get/index.js';
import { CreateLinkTool } from '#tools/api/issues/links/create/index.js';
import { DeleteLinkTool } from '#tools/api/issues/links/delete/index.js';
import { AddCommentTool } from '#tools/api/comments/add/index.js';
import { GetCommentsTool } from '#tools/api/comments/get/index.js';
import { EditCommentTool } from '#tools/api/comments/edit/index.js';
import { DeleteCommentTool } from '#tools/api/comments/delete/index.js';
import { GetAttachmentsTool } from '#tools/api/issues/attachments/get/index.js';
import { UploadAttachmentTool } from '#tools/api/issues/attachments/upload/index.js';
import { DownloadAttachmentTool } from '#tools/api/issues/attachments/download/index.js';
import { DeleteAttachmentTool } from '#tools/api/issues/attachments/delete/index.js';
import { GetThumbnailTool } from '#tools/api/issues/attachments/thumbnail/index.js';
import {
  GetChecklistTool,
  AddChecklistItemTool,
  UpdateChecklistItemTool,
  DeleteChecklistItemTool,
} from '#tools/api/checklists/index.js';
import {
  GetProjectsTool,
  GetProjectTool,
  CreateProjectTool,
  UpdateProjectTool,
  DeleteProjectTool,
} from '#tools/api/projects/index.js';
import {
  GetWorklogsTool,
  AddWorklogTool,
  UpdateWorklogTool,
  DeleteWorklogTool,
} from '#tools/api/worklog/index.js';
import {
  BulkUpdateIssuesTool,
  BulkTransitionIssuesTool,
  BulkMoveIssuesTool,
  GetBulkChangeStatusTool,
} from '#tools/api/bulk-change/index.js';
import { IssueUrlTool } from '#tools/helpers/issue-url/index.js';
import { DemoTool } from '#tools/helpers/demo/index.js';
import { RawApiRequestTool } from '#tools/api/raw/index.js';
import {
  GetBoardsTool,
  GetBoardTool,
  CreateBoardTool,
  UpdateBoardTool,
  DeleteBoardTool,
  GetBoardColumnsTool,
  CreateBoardColumnTool,
  UpdateBoardColumnTool,
  DeleteBoardColumnTool,
} from '#tools/api/boards/index.js';
import {
  GetSprintsTool,
  GetSprintTool,
  CreateSprintTool,
  UpdateSprintTool,
  ManageSprintLifecycleTool,
} from '#tools/api/sprints/index.js';
import {
  FindEntitiesTool,
  GetEntityTool,
  CreateEntityTool,
  UpdateEntityTool,
  DeleteEntityTool,
  GetGoalKeyResultsTool,
  AddGoalKeyResultTool,
  SetGoalKeyResultsTool,
  ClearGoalKeyResultsTool,
} from '#tools/api/entities/index.js';
import { FindUsersTool, GetUsersTool } from '#tools/api/users/index.js';
import {
  GetIssueTypesTool,
  GetStatusesTool,
  GetResolutionsTool,
  GetPrioritiesTool,
} from '#tools/api/administration/index.js';
import { GetFiltersTool, CreateFilterTool, UpdateFilterTool } from '#tools/api/filters/index.js';
import {
  GetQueueLocalFieldsTool,
  CreateQueueLocalFieldTool,
  UpdateQueueLocalFieldTool,
} from '#tools/api/queue-local-fields/index.js';
import { SearchWorklogTool } from '#tools/api/worklog/index.js';
import {
  GetGlobalFieldsTool,
  GetGlobalFieldTool,
  CreateGlobalFieldTool,
  UpdateGlobalFieldTool,
  DeleteGlobalFieldTool,
} from '#tools/api/fields/index.js';

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
  GetComponentsTool,
  CreateComponentTool,
  UpdateComponentTool,
  DeleteComponentTool,
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
  GetChecklistTool,
  AddChecklistItemTool,
  UpdateChecklistItemTool,
  DeleteChecklistItemTool,
  GetProjectsTool,
  GetProjectTool,
  CreateProjectTool,
  UpdateProjectTool,
  DeleteProjectTool,
  GetWorklogsTool,
  AddWorklogTool,
  UpdateWorklogTool,
  DeleteWorklogTool,
  BulkUpdateIssuesTool,
  BulkTransitionIssuesTool,
  BulkMoveIssuesTool,
  GetBulkChangeStatusTool,
  IssueUrlTool,
  DemoTool,
  RawApiRequestTool,
  // Пакет 7.2.A/7.2.B (.agentic-planning/plan_mcp_2026_modernization/7.2_api_coverage_parallel.md):
  // основание Boards/Sprints (Tool-層 отсутствовал целиком, хотя Operations/Facade уже были),
  // Entity API (Goal/Project/Portfolio) + Key Results, Users, справочники Administration,
  // сохранённые фильтры, локальные поля очереди, колонки доски, жизненный цикл спринта,
  // поиск по worklog в масштабе организации.
  GetBoardsTool,
  GetBoardTool,
  CreateBoardTool,
  UpdateBoardTool,
  DeleteBoardTool,
  GetSprintsTool,
  GetSprintTool,
  CreateSprintTool,
  UpdateSprintTool,
  FindEntitiesTool,
  GetEntityTool,
  CreateEntityTool,
  UpdateEntityTool,
  DeleteEntityTool,
  GetGoalKeyResultsTool,
  AddGoalKeyResultTool,
  SetGoalKeyResultsTool,
  ClearGoalKeyResultsTool,
  FindUsersTool,
  GetUsersTool,
  GetIssueTypesTool,
  GetStatusesTool,
  GetResolutionsTool,
  GetPrioritiesTool,
  GetFiltersTool,
  CreateFilterTool,
  UpdateFilterTool,
  GetQueueLocalFieldsTool,
  CreateQueueLocalFieldTool,
  UpdateQueueLocalFieldTool,
  GetBoardColumnsTool,
  CreateBoardColumnTool,
  UpdateBoardColumnTool,
  DeleteBoardColumnTool,
  ManageSprintLifecycleTool,
  SearchWorklogTool,
  // Пакет 7.2.E: глобальные поля Трекера (`/v2/fields`) — Operation/Service/Facade уже
  // существовали, но не были обёрнуты ни одним Tool. НЕ путать с локальными полями
  // очереди выше (GetQueueLocalFieldsTool и др.) — разные сущности, разная адресация.
  GetGlobalFieldsTool,
  GetGlobalFieldTool,
  CreateGlobalFieldTool,
  UpdateGlobalFieldTool,
  DeleteGlobalFieldTool,
] as const;

/**
 * Тип для Tool классов (type-safe)
 */
export type ToolClass = (typeof TOOL_CLASSES)[number];
