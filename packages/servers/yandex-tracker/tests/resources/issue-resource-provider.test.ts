/**
 * Unit-тесты IssueResourceProvider (пакет 5.1.C.tracker плана модернизации
 * MCP 2026-07-28).
 */

import { describe, it, expect, vi } from 'vitest';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { IssueResourceProvider } from '#resources/issue-resource-provider.js';
import { buildIssueResourceUri } from '#resources/tracker-resource-uri.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';

const mockIssue: IssueWithUnknownFields = {
  id: '1',
  key: 'QUEUE-1',
  summary: 'Test Issue',
  queue: { id: '1', key: 'QUEUE', name: 'Queue' },
  status: { id: '1', key: 'open', display: 'Open' },
};

function makeFacade(overrides?: Partial<YandexTrackerFacade>): YandexTrackerFacade {
  return {
    getIssues: vi.fn(),
    ...overrides,
  } as unknown as YandexTrackerFacade;
}

describe('IssueResourceProvider', () => {
  it('id === "tracker-issues"', () => {
    const provider = new IssueResourceProvider(makeFacade());
    expect(provider.id).toBe('tracker-issues');
  });

  it('listResources() всегда пуст (задачи не перечисляются — см. заголовок файла)', async () => {
    const provider = new IssueResourceProvider(makeFacade());
    const page = await provider.listResources();
    expect(page.resources).toEqual([]);
    expect(page.nextCursor).toBeUndefined();
  });

  it('readResource() читает задачу по ключу напрямую (URI НЕ был в listResources)', async () => {
    const getIssues = vi
      .fn()
      .mockResolvedValue([{ status: 'fulfilled', key: 'QUEUE-1', index: 0, value: mockIssue }]);
    const provider = new IssueResourceProvider(makeFacade({ getIssues }));

    const uri = buildIssueResourceUri('QUEUE-1');
    const contents = await provider.readResource(uri);

    expect(getIssues).toHaveBeenCalledWith(['QUEUE-1']);
    expect(contents).toHaveLength(1);
    const [content] = contents ?? [];
    expect(content?.uri).toBe(uri);
    expect(content?.mimeType).toBe('application/json');
    expect(JSON.parse((content as { text: string }).text)).toEqual(mockIssue);
  });

  it('readResource() возвращает undefined для чужой схемы URI (не "мой" URI)', async () => {
    const provider = new IssueResourceProvider(makeFacade());
    const contents = await provider.readResource('tracker://queue/QUEUE');
    expect(contents).toBeUndefined();
  });

  it('readResource() возвращает undefined на 404 (несуществующая задача)', async () => {
    const getIssues = vi.fn().mockResolvedValue([
      {
        status: 'rejected',
        key: 'QUEUE-404',
        index: 0,
        reason: new ApiErrorClass(404, 'Not found'),
      },
    ]);
    const provider = new IssueResourceProvider(makeFacade({ getIssues }));

    const contents = await provider.readResource(buildIssueResourceUri('QUEUE-404'));
    expect(contents).toBeUndefined();
  });

  it('readResource() пробрасывает НЕ-404 ошибку (не маскирует реальный сбой под "не найдено")', async () => {
    const getIssues = vi.fn().mockResolvedValue([
      {
        status: 'rejected',
        key: 'QUEUE-500',
        index: 0,
        reason: new ApiErrorClass(500, 'Internal error'),
      },
    ]);
    const provider = new IssueResourceProvider(makeFacade({ getIssues }));

    await expect(provider.readResource(buildIssueResourceUri('QUEUE-500'))).rejects.toThrow(
      'Internal error'
    );
  });

  it('listTemplates() отдаёт один шаблон tracker://issue/{key}', async () => {
    const provider = new IssueResourceProvider(makeFacade());
    const templates = await provider.listTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0]?.uriTemplate).toBe('tracker://issue/{key}');
  });
});
