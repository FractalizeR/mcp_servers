/**
 * Контрактный тест пакета 2.4 (`.agentic-planning/plan_tracker_tool_fixes/2.4_contract_test_sequential.md`).
 *
 * ПРОБЛЕМА, которую тест обязан ловить: сервер НЕ валидирует `structuredContent`
 * перед отправкой клиенту (`build-mcp-server.ts`, обработчик `tools/call` отдаёт
 * результат `formatSuccess()` как есть — валидация живёт только у клиента MCP).
 * Дефект №1 был именно такого рода: `errors[].error` в схеме объявлялся
 * `z.string()`, а `BatchResultProcessor.process()`
 * (`@fractalizer/mcp-core`, `src/utils/batch-result-processor.ts:86-96`) кладёт
 * туда `ApiErrorClass.toJSON()` — ОБЪЕКТ `{statusCode, message, errors?,
 * retryAfter?}` — при любой ошибке HTTP-слоя. Ни один существующий тест этого
 * не ловил, потому что моки использовали `new Error(...)` (даёт строку) вместо
 * `ApiErrorClass` (даёт объект). Живое подтверждение см. в
 * `.agentic-planning/plan_tracker_tool_fixes/0_enumeration.md`, раздел
 * «Уточнения по итогам ревью плана».
 *
 * ПОДХОД: для каждого batch-инструмента из Таблицы 1 перечисления выполняем
 * `execute()` с замоканным фасадом так, чтобы часть элементов batch упала с
 * `ApiErrorClass` — ОБЯЗАТЕЛЬНО в двух формах `toJSON()`:
 * - 404 (`{statusCode, message}` — только гарантированные поля)
 * - 409 (`{statusCode, message, errors}` — с опциональным полем `errors`)
 * — и валидируем реальный `structuredContent` результата по `outputSchema`
 * ЭТОГО ЖЕ инструмента (через Zod `*OutputDataSchema` + `successEnvelopeSchema`,
 * тот же Zod-объект, из которого генерируется JSON Schema definition — см.
 * `src/common/schemas/output.schema.ts`). Успешный сценарий (0 ошибок)
 * проверяется тем же вызовом (один элемент batch всегда fulfilled) — если
 * убрать assertion на happy path, тест рискует зеленеть вхолостую даже при
 * сломанной схеме успешной ветки.
 *
 * ПОЛНОТА (требование 3 задания пакета): вместо статического списка тест
 * механически пересканирует `src/tools/api/**\/*.tool.ts` на те же два
 * паттерна, которыми была снята Таблица 1 (`BatchResultProcessor.process(` /
 * `errors.map(` / `failed.map(`), и сверяет найденный набор файлов с набором,
 * реально покрытым `BATCH_TOOL_CASES` ниже. Новый batch-инструмент, добавленный
 * в будущем и матчащий тот же паттерн, но не описанный в `BATCH_TOOL_CASES`,
 * ПРОВАЛИТ тест `enumerate: полнота списка` — а не пройдёт незамеченным.
 * Полностью динамический прогон (без хардкода фасада/параметров на инструмент)
 * невозможен: у каждого инструмента свой метод фасада, форма параметров и
 * форма ключа batch-результата (issueId, "issueId:commentId",
 * "issueId/itemId", ...) — эту связку неоткуда взять кроме кода инструмента.
 */

import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import { successEnvelopeSchema, BatchErrorValueSchema } from '#common/schemas/index.js';
import type { z } from 'zod';

import { GetCommentsTool } from '#tools/api/comments/get/index.js';
import { GetCommentsOutputDataSchema } from '#tools/api/comments/get/get-comments.schema.js';
import { AddCommentTool } from '#tools/api/comments/add/index.js';
import { AddCommentOutputDataSchema } from '#tools/api/comments/add/add-comment.schema.js';
import { EditCommentTool } from '#tools/api/comments/edit/index.js';
import { EditCommentOutputDataSchema } from '#tools/api/comments/edit/edit-comment.schema.js';
import { DeleteCommentTool } from '#tools/api/comments/delete/index.js';
import { DeleteCommentOutputDataSchema } from '#tools/api/comments/delete/delete-comment.schema.js';

import { AddChecklistItemTool } from '#tools/api/checklists/add/index.js';
import { AddChecklistItemOutputDataSchema } from '#tools/api/checklists/add/add-checklist-item.schema.js';
import { UpdateChecklistItemTool } from '#tools/api/checklists/update/index.js';
import { UpdateChecklistItemOutputDataSchema } from '#tools/api/checklists/update/update-checklist-item.schema.js';
import { DeleteChecklistItemTool } from '#tools/api/checklists/delete/index.js';
import { DeleteChecklistItemOutputDataSchema } from '#tools/api/checklists/delete/delete-checklist-item.schema.js';
import { GetChecklistTool } from '#tools/api/checklists/get/index.js';
import { GetChecklistOutputDataSchema } from '#tools/api/checklists/get/get-checklist.schema.js';

import { GetIssuesTool } from '#tools/api/issues/get/index.js';
import { GetIssuesOutputDataSchema } from '#tools/api/issues/get/get-issues.schema.js';
import { CreateLinkTool } from '#tools/api/issues/links/create/index.js';
import { CreateLinkOutputDataSchema } from '#tools/api/issues/links/create/create-link.schema.js';
import { DeleteLinkTool } from '#tools/api/issues/links/delete/index.js';
import { DeleteLinkOutputDataSchema } from '#tools/api/issues/links/delete/delete-link.schema.js';
import { GetIssueLinksTool } from '#tools/api/issues/links/get/index.js';
import { GetIssueLinksOutputDataSchema } from '#tools/api/issues/links/get/get-issue-links.schema.js';
import { GetIssueChangelogTool } from '#tools/api/issues/changelog/index.js';
import { GetIssueChangelogOutputDataSchema } from '#tools/api/issues/changelog/get-issue-changelog.schema.js';
import { GetAttachmentsTool } from '#tools/api/issues/attachments/get/index.js';
import { GetAttachmentsOutputDataSchema } from '#tools/api/issues/attachments/get/get-attachments.schema.js';

import { GetUsersTool } from '#tools/api/users/index.js';
import { GetUsersOutputDataSchema } from '#tools/api/users/get-users.schema.js';

import { AddWorklogTool } from '#tools/api/worklog/add/index.js';
import { AddWorklogOutputDataSchema } from '#tools/api/worklog/add/add-worklog.schema.js';
import { GetWorklogsTool } from '#tools/api/worklog/get/index.js';
import { GetWorklogsOutputDataSchema } from '#tools/api/worklog/get/get-worklogs.schema.js';

function mockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

function getStructuredContent(result: ToolResult): unknown {
  return (result as unknown as { structuredContent?: unknown }).structuredContent;
}

/** 404: только гарантированные поля `ApiErrorDetails` (statusCode, message). */
function apiError404(): ApiErrorClass {
  return new ApiErrorClass(404, 'Сущность не найдена');
}

/** 409: с заполненным опциональным полем `errors` — другая форма toJSON(). */
function apiError409(): ApiErrorClass {
  return new ApiErrorClass(409, 'Конфликт состояния', { state: ['уже в этом статусе'] });
}

interface PaginationMetaLike {
  hasNextPage: boolean;
  fetchedAll: boolean;
  truncated: boolean;
  hasError: boolean;
  pagesFetched: number;
}

const PAGINATION_META: PaginationMetaLike = {
  hasNextPage: false,
  fetchedAll: true,
  truncated: false,
  hasError: false,
  pagesFetched: 1,
};

function paginatedValue(items: Array<Record<string, unknown>>): {
  items: Array<Record<string, unknown>>;
  pagination: PaginationMetaLike;
} {
  return { items, pagination: PAGINATION_META };
}

interface FulfilledLike {
  status: 'fulfilled';
  key: string;
  index: number;
  value: unknown;
}
interface RejectedLike {
  status: 'rejected';
  key: string;
  index: number;
  reason: Error;
}

function fulfilled(key: string, index: number, value: unknown): FulfilledLike {
  return { status: 'fulfilled', key, index, value };
}
function rejected(key: string, index: number, reason: Error): RejectedLike {
  return { status: 'rejected', key, index, reason };
}

/**
 * Одно описание batch-инструмента: как собрать параметры, как замокать
 * фасад, какой Zod schema сверять `structuredContent`.
 *
 * `keys.success/notFound/conflict` — ключи batch-результата в ТОЧНОЙ форме,
 * которую ожидает `*.tool.ts` (issueId, "issueId:commentId",
 * "issueId/itemId", ...) — иначе `.split()` в инструменте даст `undefined`
 * там, где схема требует `z.string()`, и тест ложно покраснеет не по вине
 * error-контракта.
 */
interface BatchToolCase {
  /** Относительный путь исходника — используется для проверки полноты. */
  sourcePath: string;
  label: string;
  outputDataSchema: z.ZodObject<z.ZodRawShape>;
  buildParams: () => ToolCallParams;
  facadeMethod: keyof YandexTrackerFacade;
  results: (FulfilledLike | RejectedLike)[];
  successOnlyResults: (FulfilledLike | RejectedLike)[];
  createTool: (
    facade: YandexTrackerFacade,
    logger: Logger
  ) => { execute: typeof GetIssuesTool.prototype.execute };
}

const successItem = { id: '1' };

const BATCH_TOOL_CASES: BatchToolCase[] = [
  {
    sourcePath: 'comments/get/get-comments.tool.ts',
    label: 'get_comments',
    outputDataSchema: GetCommentsOutputDataSchema,
    facadeMethod: 'getCommentsMany',
    buildParams: () => ({ issueIds: ['TEST-1', 'TEST-2', 'TEST-3'], fields: ['id'] }),
    results: [
      fulfilled('TEST-1', 0, paginatedValue([successItem])),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, paginatedValue([successItem]))],
    createTool: (facade, logger) => new GetCommentsTool(facade, logger),
  },
  {
    sourcePath: 'comments/add/add-comment.tool.ts',
    label: 'add_comment',
    outputDataSchema: AddCommentOutputDataSchema,
    facadeMethod: 'addCommentsMany',
    buildParams: () => ({
      comments: [
        { issueId: 'TEST-1', text: 'hi' },
        { issueId: 'TEST-2', text: 'hi' },
        { issueId: 'TEST-3', text: 'hi' },
      ],
      fields: ['id'],
    }),
    results: [
      fulfilled('TEST-1', 0, successItem),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, successItem)],
    createTool: (facade, logger) => new AddCommentTool(facade, logger),
  },
  {
    sourcePath: 'comments/edit/edit-comment.tool.ts',
    label: 'edit_comment',
    outputDataSchema: EditCommentOutputDataSchema,
    facadeMethod: 'editCommentsMany',
    buildParams: () => ({
      comments: [
        { issueId: 'TEST-1', commentId: '1', text: 'hi' },
        { issueId: 'TEST-2', commentId: '2', text: 'hi' },
        { issueId: 'TEST-3', commentId: '3', text: 'hi' },
      ],
      fields: ['id'],
    }),
    results: [
      fulfilled('TEST-1:1', 0, successItem),
      rejected('TEST-2:2', 1, apiError404()),
      rejected('TEST-3:3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1:1', 0, successItem)],
    createTool: (facade, logger) => new EditCommentTool(facade, logger),
  },
  {
    sourcePath: 'comments/delete/delete-comment.tool.ts',
    label: 'delete_comment',
    outputDataSchema: DeleteCommentOutputDataSchema,
    facadeMethod: 'deleteCommentsMany',
    buildParams: () => ({
      comments: [
        { issueId: 'TEST-1', commentId: '1' },
        { issueId: 'TEST-2', commentId: '2' },
        { issueId: 'TEST-3', commentId: '3' },
      ],
    }),
    results: [
      fulfilled('TEST-1:1', 0, undefined),
      rejected('TEST-2:2', 1, apiError404()),
      rejected('TEST-3:3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1:1', 0, undefined)],
    createTool: (facade, logger) => new DeleteCommentTool(facade, logger),
  },
  {
    sourcePath: 'checklists/add/add-checklist-item.tool.ts',
    label: 'add_checklist_item',
    outputDataSchema: AddChecklistItemOutputDataSchema,
    facadeMethod: 'addChecklistItemMany',
    buildParams: () => ({
      items: [
        { issueId: 'TEST-1', text: 'a' },
        { issueId: 'TEST-2', text: 'b' },
        { issueId: 'TEST-3', text: 'c' },
      ],
      fields: ['id'],
    }),
    results: [
      fulfilled('TEST-1', 0, successItem),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, successItem)],
    createTool: (facade, logger) => new AddChecklistItemTool(facade, logger),
  },
  {
    sourcePath: 'checklists/update/update-checklist-item.tool.ts',
    label: 'update_checklist_item',
    outputDataSchema: UpdateChecklistItemOutputDataSchema,
    facadeMethod: 'updateChecklistItemMany',
    buildParams: () => ({
      items: [
        { issueId: 'TEST-1', checklistItemId: '1', text: 'a' },
        { issueId: 'TEST-2', checklistItemId: '2', text: 'b' },
        { issueId: 'TEST-3', checklistItemId: '3', text: 'c' },
      ],
      fields: ['id'],
    }),
    results: [
      fulfilled('TEST-1/1', 0, successItem),
      rejected('TEST-2/2', 1, apiError404()),
      rejected('TEST-3/3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1/1', 0, successItem)],
    createTool: (facade, logger) => new UpdateChecklistItemTool(facade, logger),
  },
  {
    sourcePath: 'checklists/delete/delete-checklist-item.tool.ts',
    label: 'delete_checklist_item',
    outputDataSchema: DeleteChecklistItemOutputDataSchema,
    facadeMethod: 'deleteChecklistItemMany',
    buildParams: () => ({
      items: [
        { issueId: 'TEST-1', itemId: '1' },
        { issueId: 'TEST-2', itemId: '2' },
        { issueId: 'TEST-3', itemId: '3' },
      ],
    }),
    results: [
      fulfilled('TEST-1/1', 0, undefined),
      rejected('TEST-2/2', 1, apiError404()),
      rejected('TEST-3/3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1/1', 0, undefined)],
    createTool: (facade, logger) => new DeleteChecklistItemTool(facade, logger),
  },
  {
    sourcePath: 'checklists/get/get-checklist.tool.ts',
    label: 'get_checklist',
    outputDataSchema: GetChecklistOutputDataSchema,
    facadeMethod: 'getChecklistMany',
    buildParams: () => ({ issueIds: ['TEST-1', 'TEST-2', 'TEST-3'], fields: ['id'] }),
    results: [
      fulfilled('TEST-1', 0, paginatedValue([successItem])),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, paginatedValue([successItem]))],
    createTool: (facade, logger) => new GetChecklistTool(facade, logger),
  },
  {
    sourcePath: 'issues/get/get-issues.tool.ts',
    label: 'get_issues',
    outputDataSchema: GetIssuesOutputDataSchema,
    facadeMethod: 'getIssues',
    buildParams: () => ({ issueIds: ['TEST-1', 'TEST-2', 'TEST-3'], fields: ['id'] }),
    results: [
      fulfilled('TEST-1', 0, successItem),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, successItem)],
    createTool: (facade, logger) => new GetIssuesTool(facade, logger),
  },
  {
    sourcePath: 'issues/links/create/create-link.tool.ts',
    label: 'create_link',
    outputDataSchema: CreateLinkOutputDataSchema,
    facadeMethod: 'createLinksMany',
    buildParams: () => ({
      links: [
        { issueId: 'TEST-1', relationship: 'relates', targetIssueId: 'TEST-9' },
        { issueId: 'TEST-2', relationship: 'relates', targetIssueId: 'TEST-9' },
        { issueId: 'TEST-3', relationship: 'relates', targetIssueId: 'TEST-9' },
      ],
      fields: ['id'],
    }),
    results: [
      fulfilled('TEST-1', 0, successItem),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, successItem)],
    createTool: (facade, logger) => new CreateLinkTool(facade, logger),
  },
  {
    sourcePath: 'issues/links/delete/delete-link.tool.ts',
    label: 'delete_link',
    outputDataSchema: DeleteLinkOutputDataSchema,
    facadeMethod: 'deleteLinksMany',
    buildParams: () => ({
      links: [
        { issueId: 'TEST-1', linkId: '1' },
        { issueId: 'TEST-2', linkId: '2' },
        { issueId: 'TEST-3', linkId: '3' },
      ],
    }),
    results: [
      fulfilled('TEST-1:1', 0, undefined),
      rejected('TEST-2:2', 1, apiError404()),
      rejected('TEST-3:3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1:1', 0, undefined)],
    createTool: (facade, logger) => new DeleteLinkTool(facade, logger),
  },
  {
    sourcePath: 'issues/links/get/get-issue-links.tool.ts',
    label: 'get_issue_links',
    outputDataSchema: GetIssueLinksOutputDataSchema,
    facadeMethod: 'getIssueLinks',
    buildParams: () => ({ issueIds: ['TEST-1', 'TEST-2', 'TEST-3'], fields: ['id'] }),
    results: [
      fulfilled('TEST-1', 0, paginatedValue([successItem])),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, paginatedValue([successItem]))],
    createTool: (facade, logger) => new GetIssueLinksTool(facade, logger),
  },
  {
    sourcePath: 'issues/changelog/get-issue-changelog.tool.ts',
    label: 'get_issue_changelog',
    outputDataSchema: GetIssueChangelogOutputDataSchema,
    facadeMethod: 'getIssueChangelog',
    buildParams: () => ({ issueIds: ['TEST-1', 'TEST-2', 'TEST-3'], fields: ['id'] }),
    results: [
      fulfilled('TEST-1', 0, paginatedValue([successItem])),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, paginatedValue([successItem]))],
    createTool: (facade, logger) => new GetIssueChangelogTool(facade, logger),
  },
  {
    sourcePath: 'issues/attachments/get/get-attachments.tool.ts',
    label: 'get_attachments',
    outputDataSchema: GetAttachmentsOutputDataSchema,
    facadeMethod: 'getAttachmentsMany',
    buildParams: () => ({ issueIds: ['TEST-1', 'TEST-2', 'TEST-3'], fields: ['id'] }),
    results: [
      fulfilled('TEST-1', 0, paginatedValue([successItem])),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, paginatedValue([successItem]))],
    createTool: (facade, logger) => new GetAttachmentsTool(facade, logger),
  },
  {
    sourcePath: 'users/get-users.tool.ts',
    label: 'get_users',
    outputDataSchema: GetUsersOutputDataSchema,
    facadeMethod: 'getUsers',
    buildParams: () => ({ userIds: ['u1', 'u2', 'u3'], fields: ['id'] }),
    results: [
      fulfilled('u1', 0, successItem),
      rejected('u2', 1, apiError404()),
      rejected('u3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('u1', 0, successItem)],
    createTool: (facade, logger) => new GetUsersTool(facade, logger),
  },
  {
    sourcePath: 'worklog/add/add-worklog.tool.ts',
    label: 'add_worklog',
    outputDataSchema: AddWorklogOutputDataSchema,
    facadeMethod: 'addWorklogsMany',
    buildParams: () => ({
      worklogs: [
        { issueId: 'TEST-1', start: '2023-01-01T00:00:00.000+0000', duration: '1h' },
        { issueId: 'TEST-2', start: '2023-01-01T00:00:00.000+0000', duration: '1h' },
        { issueId: 'TEST-3', start: '2023-01-01T00:00:00.000+0000', duration: '1h' },
      ],
      fields: ['id'],
    }),
    results: [
      fulfilled('TEST-1', 0, successItem),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, successItem)],
    createTool: (facade, logger) => new AddWorklogTool(facade, logger),
  },
  {
    sourcePath: 'worklog/get/get-worklogs.tool.ts',
    label: 'get_worklogs',
    outputDataSchema: GetWorklogsOutputDataSchema,
    facadeMethod: 'getWorklogsMany',
    buildParams: () => ({ issueIds: ['TEST-1', 'TEST-2', 'TEST-3'], fields: ['id'] }),
    results: [
      fulfilled('TEST-1', 0, paginatedValue([successItem])),
      rejected('TEST-2', 1, apiError404()),
      rejected('TEST-3', 2, apiError409()),
    ],
    successOnlyResults: [fulfilled('TEST-1', 0, paginatedValue([successItem]))],
    createTool: (facade, logger) => new GetWorklogsTool(facade, logger),
  },
];

function buildFacade(
  method: keyof YandexTrackerFacade,
  resolvedValue: unknown
): YandexTrackerFacade {
  return { [method]: vi.fn().mockResolvedValue(resolvedValue) } as unknown as YandexTrackerFacade;
}

describe('Пакет 2.4: batch-инструменты — structuredContent валиден по outputSchema при ApiErrorClass', () => {
  describe.each(BATCH_TOOL_CASES)('$label ($sourcePath)', (testCase) => {
    it('успех + 404 + 409 в одном batch — structuredContent проходит outputSchema', async () => {
      const facade = buildFacade(testCase.facadeMethod, testCase.results);
      const tool = testCase.createTool(facade, mockLogger());

      const result = await tool.execute(testCase.buildParams());
      const structured = getStructuredContent(result);
      const parsed = successEnvelopeSchema(testCase.outputDataSchema).safeParse(structured);

      expect(
        result.isError,
        `execute() вернул ошибку: ${JSON.stringify(structured)}`
      ).toBeUndefined();
      expect(
        parsed.success,
        parsed.success ? undefined : JSON.stringify(parsed.error.issues, null, 2)
      ).toBe(true);
    });

    it('успешный сценарий (0 ошибок) — structuredContent тоже валиден', async () => {
      const facade = buildFacade(testCase.facadeMethod, testCase.successOnlyResults);
      const tool = testCase.createTool(facade, mockLogger());

      // Параметры используем те же (fields/тип полей не меняются от исхода),
      // но фактический batch — только один успешный элемент.
      const singleItemParams = shrinkToFirstBatchElement(testCase.buildParams());

      const result = await tool.execute(singleItemParams);
      const structured = getStructuredContent(result);
      const parsed = successEnvelopeSchema(testCase.outputDataSchema).safeParse(structured);

      expect(
        result.isError,
        `execute() вернул ошибку: ${JSON.stringify(structured)}`
      ).toBeUndefined();
      expect(
        parsed.success,
        parsed.success ? undefined : JSON.stringify(parsed.error.issues, null, 2)
      ).toBe(true);
    });
  });
});

/**
 * У параметров batch-инструментов ключ массива называется по-разному
 * (issueIds/comments/items/links/worklogs/userIds) — но ровно один
 * ключ верхнего уровня всегда массив длины 3. Урезаем его до 1 элемента для
 * success-only сценария, оставляя остальные параметры (fields и т.п.) как есть.
 */
function shrinkToFirstBatchElement(params: ToolCallParams): ToolCallParams {
  const result: Record<string, unknown> = { ...params };
  for (const [key, value] of Object.entries(result)) {
    if (Array.isArray(value) && value.length === 3) {
      result[key] = [value[0]];
    }
  }
  return result;
}

describe('Находка 1 внешнего ревью (BLOCKER): BatchErrorValueSchema.errors допускает обе формы значения', () => {
  // Проблема: `errors` объявлялся как z.record(z.string(), z.array(z.string())) —
  // только массив строк на ключ. Рантайм-форма ничем не подтверждена: ErrorMapper
  // (`error-mapper.ts:71`) берёт значение НЕВАЛИДИРОВАННЫМ кастом из тела ответа
  // Трекера, а референсный Python-клиент (`exceptions.py:84-87`) форматирует его как
  // СКАЛЯР на ключ. Строгая схема отбраковывала бы валидный batch-ответ ровно так же,
  // как отбраковывался ответ до всей волны фиксов ("Structured content does not match
  // the tool's output schema") — только теперь на errors внутри 400, а не на форме error.
  it('принимает errors со значением-строкой на ключ (форма референсного клиента)', () => {
    const parsed = BatchErrorValueSchema.safeParse({
      statusCode: 400,
      message: 'Validation failed',
      errors: { summary: 'Required field' },
    });

    expect(parsed.success, parsed.success ? undefined : JSON.stringify(parsed.error.issues)).toBe(
      true
    );
  });

  it('продолжает принимать errors со значением-массивом строк на ключ (документированная форма)', () => {
    const parsed = BatchErrorValueSchema.safeParse({
      statusCode: 400,
      message: 'Validation failed',
      errors: { summary: ['Required field', 'Too long'] },
    });

    expect(parsed.success, parsed.success ? undefined : JSON.stringify(parsed.error.issues)).toBe(
      true
    );
  });

  it('принимает смешанные значения (строка и массив в одном errors)', () => {
    const parsed = BatchErrorValueSchema.safeParse({
      statusCode: 400,
      message: 'Validation failed',
      errors: { summary: 'Required field', assignee: ['Invalid user ID'] },
    });

    expect(parsed.success, parsed.success ? undefined : JSON.stringify(parsed.error.issues)).toBe(
      true
    );
  });
});

describe('Пакет 2.4: полнота списка batch-инструментов (требование 3 задания)', () => {
  it('BATCH_TOOL_CASES покрывает ровно те *.tool.ts, что матчат паттерн выборки Таблицы 1', () => {
    const thisFileDir = dirname(fileURLToPath(import.meta.url));
    const toolsApiRoot = join(thisFileDir, '..', '..', 'src', 'tools', 'api');

    const PATTERN = /errors\.map\(|failed\.map\(|BatchResultProcessor\.process\(/;
    const found = new Set<string>();

    function walk(dir: string): void {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (!entry.name.endsWith('.tool.ts')) continue;
        const content = readFileSync(fullPath, 'utf-8');
        if (PATTERN.test(content)) {
          found.add(fullPath.slice(toolsApiRoot.length + 1).replace(/\\/g, '/'));
        }
      }
    }
    walk(toolsApiRoot);

    const covered = new Set(BATCH_TOOL_CASES.map((c) => c.sourcePath));

    const missingFromTest = [...found].filter((f) => !covered.has(f)).sort();
    const staleInTest = [...covered].filter((f) => !found.has(f)).sort();

    expect(
      missingFromTest,
      `Найдены *.tool.ts с признаками batch-ошибок, но НЕ покрытые тестом ` +
        `(добавь кейс в BATCH_TOOL_CASES, tests/smoke/batch-tool-error-contract.test.ts): ` +
        JSON.stringify(missingFromTest)
    ).toEqual([]);
    expect(
      staleInTest,
      `BATCH_TOOL_CASES ссылается на файлы, которые больше не матчат паттерн batch-ошибок ` +
        `(инструмент удалён/переписан — почисти BATCH_TOOL_CASES): ` +
        JSON.stringify(staleInTest)
    ).toEqual([]);
  });
});
