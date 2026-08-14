/**
 * Unit-тесты QueueResourceProvider (пакет 5.1.C.tracker плана модернизации
 * MCP 2026-07-28).
 */

import { describe, it, expect, vi } from 'vitest';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { QueueResourceProvider } from '#resources/queue-resource-provider.js';
import { buildQueueResourceUri } from '#resources/tracker-resource-uri.js';
import { createQueueListFixture, createQueueFixture } from '#helpers/queue.fixture.js';
import type { PaginatedResult, QueueWithUnknownFields } from '#tracker_api/entities/index.js';

function page(
  items: QueueWithUnknownFields[],
  nextCursor?: string
): PaginatedResult<QueueWithUnknownFields> {
  return {
    items,
    pagination: {
      hasNextPage: nextCursor !== undefined,
      fetchedAll: nextCursor === undefined,
      truncated: false,
      hasError: false,
      pagesFetched: 1,
      ...(nextCursor !== undefined ? { nextCursor } : {}),
    },
  };
}

function makeFacade(overrides?: Partial<YandexTrackerFacade>): YandexTrackerFacade {
  return {
    getQueues: vi.fn(),
    getQueue: vi.fn(),
    ...overrides,
  } as unknown as YandexTrackerFacade;
}

describe('QueueResourceProvider', () => {
  it('id === "tracker-queues"', () => {
    expect(new QueueResourceProvider(makeFacade()).id).toBe('tracker-queues');
  });

  it('listResources() перечисляет очереди и пробрасывает nextCursor Трекера как есть', async () => {
    const queues = createQueueListFixture(2);
    const getQueues = vi.fn().mockResolvedValue(page(queues, 'c1:opaque-cursor'));
    const provider = new QueueResourceProvider(makeFacade({ getQueues }));

    const result = await provider.listResources();

    expect(getQueues).toHaveBeenCalledWith(undefined);
    expect(result.resources).toHaveLength(2);
    expect(result.resources[0]).toMatchObject({
      uri: buildQueueResourceUri(queues[0]!.key),
      name: queues[0]!.key,
      title: queues[0]!.name,
    });
    expect(result.nextCursor).toBe('c1:opaque-cursor');
  });

  it('listResources(cursor) передаёт курсор дальше facade.getQueues без второго кодирования', async () => {
    const getQueues = vi.fn().mockResolvedValue(page([]));
    const provider = new QueueResourceProvider(makeFacade({ getQueues }));

    await provider.listResources('c1:some-cursor');

    expect(getQueues).toHaveBeenCalledWith({ cursor: 'c1:some-cursor' });
  });

  it('readResource() читает очередь по ключу, отсутствующему в listResources', async () => {
    const queue = createQueueFixture({ key: 'HIDDEN' });
    const getQueue = vi.fn().mockResolvedValue(queue);
    const provider = new QueueResourceProvider(makeFacade({ getQueue }));

    const uri = buildQueueResourceUri('HIDDEN');
    const contents = await provider.readResource(uri);

    expect(getQueue).toHaveBeenCalledWith({ queueId: 'HIDDEN' });
    expect(contents).toHaveLength(1);
    expect(JSON.parse((contents?.[0] as { text: string }).text)).toEqual(queue);
  });

  it('readResource() возвращает undefined для чужой схемы URI', async () => {
    const provider = new QueueResourceProvider(makeFacade());
    expect(await provider.readResource('tracker://issue/QUEUE-1')).toBeUndefined();
  });

  it('readResource() возвращает undefined на 404', async () => {
    const getQueue = vi.fn().mockRejectedValue(new ApiErrorClass(404, 'Not found'));
    const provider = new QueueResourceProvider(makeFacade({ getQueue }));

    expect(await provider.readResource(buildQueueResourceUri('NOPE'))).toBeUndefined();
  });

  it('readResource() пробрасывает НЕ-404 ошибку', async () => {
    const getQueue = vi.fn().mockRejectedValue(new ApiErrorClass(500, 'Internal error'));
    const provider = new QueueResourceProvider(makeFacade({ getQueue }));

    await expect(provider.readResource(buildQueueResourceUri('BOOM'))).rejects.toThrow(
      'Internal error'
    );
  });

  it('listTemplates() отдаёт один шаблон tracker://queue/{key}', async () => {
    const templates = await new QueueResourceProvider(makeFacade()).listTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0]?.uriTemplate).toBe('tracker://queue/{key}');
  });
});
