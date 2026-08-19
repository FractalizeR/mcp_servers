/**
 * DoD 2 пакета 3.1.C.tracker: `structuredContent` реального результата
 * `execute()` валиден по `outputSchema` того же инструмента — проверено для
 * представителя каждой категории/формы ответа:
 *
 * - ping (System) — плоский объект, обращается к API
 * - get_issues (Issues/Read, batch) — успех+ошибки, FilteredEntitySchema
 * - create_issue (Issues/Write, единичная операция)
 * - add_comment (Comments/Write, batch create — total/successful/failed числа)
 * - delete_comment (Comments/Write, batch delete — успех/ошибка массивами)
 * - get_projects (Projects/Read, пагинация seekable)
 * - issue_url (Helpers, БЕЗ обращения к API)
 *
 * Схема успешного envelope `{ success: true, data }` проверяется через
 * `successEnvelopeSchema(...)`, применённую к Zod `*OutputDataSchema`
 * (тот же Zod-объект, из которого builds `outputSchema` в definition —
 * см. src/common/schemas/output.schema.ts).
 */

import { describe, it, expect, vi } from 'vitest';
import { createQueueRef } from '#helpers/common-fixtures.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import { successEnvelopeSchema } from '#common/schemas/index.js';

import { PingTool } from '#tools/ping.tool.js';
import { PingOutputDataSchema } from '#tools/ping.schema.js';

import { GetIssuesTool } from '#tools/api/issues/get/index.js';
import { GetIssuesOutputDataSchema } from '#tools/api/issues/get/get-issues.schema.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';

import { CreateIssueTool } from '#tools/api/issues/create/index.js';
import { CreateIssueOutputDataSchema } from '#tools/api/issues/create/create-issue.schema.js';

import { AddCommentTool } from '#tools/api/comments/add/index.js';
import { AddCommentOutputDataSchema } from '#tools/api/comments/add/add-comment.schema.js';
import { createCommentFixture } from '#helpers/comment.fixture.js';

import { DeleteCommentTool } from '#tools/api/comments/delete/index.js';
import { DeleteCommentOutputDataSchema } from '#tools/api/comments/delete/delete-comment.schema.js';

import { GetProjectsTool } from '#tools/api/projects/get-projects.tool.js';
import { GetProjectsOutputDataSchema } from '#tools/api/projects/get-projects.schema.js';
import { createProjectListFixture } from '#helpers/project.fixture.js';
import type { PaginatedResult, ProjectWithUnknownFields } from '#tracker_api/entities/index.js';

import { IssueUrlTool } from '#tools/helpers/issue-url/index.js';
import { IssueUrlOutputDataSchema } from '#tools/helpers/issue-url/issue-url.schema.js';

import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';
import type { ToolResult } from '@fractalizer/mcp-infrastructure';
import { createIssueFixture } from '#helpers/issue.fixture.js';

function mockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

/** Достаёт structuredContent из ToolResult без `any`. */
function getStructuredContent(result: ToolResult): unknown {
  return result['structuredContent'];
}

function paginatedProjects(
  items: ProjectWithUnknownFields[],
  total?: number
): PaginatedResult<ProjectWithUnknownFields> {
  return {
    items,
    pagination: {
      hasNextPage: false,
      fetchedAll: true,
      truncated: false,
      hasError: false,
      pagesFetched: 1,
      ...(total !== undefined ? { total } : {}),
    },
  };
}

describe('DoD 2: structuredContent валиден по outputSchema (представители категорий)', () => {
  it('ping — System', async () => {
    const facade = {
      ping: vi.fn().mockResolvedValue({ message: 'pong' }),
    } as unknown as YandexTrackerFacade;
    const tool = new PingTool(facade, mockLogger());

    const result = await tool.execute({});
    const envelope = successEnvelopeSchema(PingOutputDataSchema).safeParse(
      getStructuredContent(result)
    );

    expect(result.isError).toBeUndefined();
    expect(envelope.success, JSON.stringify(envelope.success ? null : envelope.error)).toBe(true);
  });

  it('get_issues — Issues/Read batch (успех + ошибка)', async () => {
    const mockIssue: IssueWithUnknownFields = createIssueFixture({
      id: '1',
      key: 'QUEUE-1',
      summary: 'Test',
      queue: createQueueRef({ id: '1', key: 'QUEUE', display: 'Queue' }),
      status: { id: '1', key: 'open', display: 'Open' },
    });
    const facade = {
      getIssues: vi.fn().mockResolvedValue([
        { status: 'fulfilled', value: mockIssue, key: 'QUEUE-1', index: 0 },
        { status: 'rejected', reason: new Error('not found'), key: 'QUEUE-2', index: 1 },
      ]),
    } as unknown as YandexTrackerFacade;
    const tool = new GetIssuesTool(facade, mockLogger());

    const result = await tool.execute({
      issueKeys: ['QUEUE-1', 'QUEUE-2'],
      fields: STANDARD_ISSUE_FIELDS,
    });
    const envelope = successEnvelopeSchema(GetIssuesOutputDataSchema).safeParse(
      getStructuredContent(result)
    );

    expect(result.isError).toBeUndefined();
    expect(envelope.success, JSON.stringify(envelope.success ? null : envelope.error)).toBe(true);
  });

  it('create_issue — Issues/Write единичная операция', async () => {
    const facade = {
      createIssue: vi.fn().mockResolvedValue({
        id: '1',
        key: 'QUEUE-1',
        summary: 'Test',
        queue: { id: '1', key: 'QUEUE', name: 'Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
      }),
    } as unknown as YandexTrackerFacade;
    const tool = new CreateIssueTool(facade, mockLogger());

    const result = await tool.execute({
      queue: 'QUEUE',
      summary: 'Test',
      fields: STANDARD_ISSUE_FIELDS,
    });
    const envelope = successEnvelopeSchema(CreateIssueOutputDataSchema).safeParse(
      getStructuredContent(result)
    );

    expect(result.isError).toBeUndefined();
    expect(envelope.success, JSON.stringify(envelope.success ? null : envelope.error)).toBe(true);
  });

  it('add_comment — Comments/Write batch create (total/successful/failed числа)', async () => {
    const facade = {
      addCommentsMany: vi.fn().mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-1',
          value: createCommentFixture({ id: '1', text: 'hi' }),
        },
      ]),
    } as unknown as YandexTrackerFacade;
    const tool = new AddCommentTool(facade, mockLogger());

    const result = await tool.execute({
      comments: [{ issueId: 'TEST-1', text: 'hi' }],
      fields: ['id', 'text'],
    });
    const envelope = successEnvelopeSchema(AddCommentOutputDataSchema).safeParse(
      getStructuredContent(result)
    );

    expect(result.isError).toBeUndefined();
    expect(envelope.success, JSON.stringify(envelope.success ? null : envelope.error)).toBe(true);
  });

  it('delete_comment — Comments/Write batch delete (успех/ошибка массивами)', async () => {
    const facade = {
      deleteCommentsMany: vi.fn().mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1:1', value: undefined },
        { status: 'rejected', key: 'TEST-1:2', reason: new Error('not found') },
      ]),
    } as unknown as YandexTrackerFacade;
    const tool = new DeleteCommentTool(facade, mockLogger());

    const result = await tool.execute({
      comments: [
        { issueId: 'TEST-1', commentId: '1' },
        { issueId: 'TEST-1', commentId: '2' },
      ],
    });
    const envelope = successEnvelopeSchema(DeleteCommentOutputDataSchema).safeParse(
      getStructuredContent(result)
    );

    expect(result.isError).toBeUndefined();
    expect(envelope.success, JSON.stringify(envelope.success ? null : envelope.error)).toBe(true);
  });

  it('get_projects — Projects/Read с пагинацией (seekable, total присутствует)', async () => {
    const facade = {
      getProjects: vi.fn().mockResolvedValue(paginatedProjects(createProjectListFixture(2), 2)),
    } as unknown as YandexTrackerFacade;
    const tool = new GetProjectsTool(facade, mockLogger());

    const result = await tool.execute({ fields: ['id', 'key', 'name'] });
    const envelope = successEnvelopeSchema(GetProjectsOutputDataSchema).safeParse(
      getStructuredContent(result)
    );

    expect(result.isError).toBeUndefined();
    expect(envelope.success, JSON.stringify(envelope.success ? null : envelope.error)).toBe(true);
  });

  it('issue_url — Helpers, без обращения к API', async () => {
    const facade = {} as unknown as YandexTrackerFacade;
    const tool = new IssueUrlTool(facade, mockLogger());

    const result = await tool.execute({ issueKeys: ['QUEUE-1', 'QUEUE-2'] });
    const envelope = successEnvelopeSchema(IssueUrlOutputDataSchema).safeParse(
      getStructuredContent(result)
    );

    expect(result.isError).toBeUndefined();
    expect(envelope.success, JSON.stringify(envelope.success ? null : envelope.error)).toBe(true);
  });
});
