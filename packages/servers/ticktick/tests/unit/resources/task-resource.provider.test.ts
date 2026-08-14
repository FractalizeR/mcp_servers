/**
 * Unit tests for TaskResourceProvider (пакет 5.1.C.ticktick)
 */

import { describe, it, expect } from 'vitest';
import { TaskResourceProvider } from '#resources/task-resource.provider.js';
import { createMockFacade } from '#helpers/index.js';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';

function makeTask(id: string, title: string, projectId = 'proj-1'): TaskWithUnknownFields {
  return {
    id,
    projectId,
    title,
    priority: 0,
    status: 0,
    createdTime: '2026-01-01T00:00:00Z',
    modifiedTime: '2026-01-01T00:00:00Z',
  };
}

describe('TaskResourceProvider', () => {
  it('имеет стабильный id провайдера', () => {
    const facade = createMockFacade();
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);
    expect(provider.id).toBe('ticktick-tasks');
  });

  it('listResources возвращает задачи как McpResource с uri схемы ticktick://task/{id}', async () => {
    const facade = createMockFacade();
    facade.getAllTasks.mockResolvedValue([makeTask('t1', 'First task')]);
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);

    const page = await provider.listResources();

    expect(page.resources).toEqual([
      {
        uri: 'ticktick://task/t1',
        name: 't1',
        title: 'First task',
        mimeType: 'application/json',
      },
    ]);
    expect(page.nextCursor).toBeUndefined();
  });

  it('listResources: пагинация офсетным курсором, вторая страница', async () => {
    const facade = createMockFacade();
    const tasks = Array.from({ length: 55 }, (_, i) => makeTask(`t${i}`, `Task ${i}`));
    facade.getAllTasks.mockResolvedValue(tasks);
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);

    const first = await provider.listResources();
    expect(first.resources).toHaveLength(50);
    expect(first.nextCursor).toBe('50');

    const second = await provider.listResources(first.nextCursor);
    expect(second.resources).toHaveLength(5);
    expect(second.nextCursor).toBeUndefined();
  });

  it('readResource по uri из listResources возвращает JSON задачи', async () => {
    const facade = createMockFacade();
    const task = makeTask('t1', 'First task');
    facade.getAllTasks.mockResolvedValue([task]);
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);

    const contents = await provider.readResource('ticktick://task/t1');

    expect(contents).toBeDefined();
    expect(contents).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [content] = contents!;
    expect(content.uri).toBe('ticktick://task/t1');
    expect(content.mimeType).toBe('application/json');
    expect(JSON.parse((content as { text: string }).text)).toMatchObject({
      id: 't1',
      title: 'First task',
    });
  });

  it('readResource: uri ОТСУТСТВУЮЩИЙ в listResources (за пределами страницы) тем не менее работает', async () => {
    const facade = createMockFacade();
    // 55 задач — task-54 не попадёт на первую (единственную запрошенную) страницу в 50 элементов.
    const tasks = Array.from({ length: 55 }, (_, i) => makeTask(`t${i}`, `Task ${i}`));
    facade.getAllTasks.mockResolvedValue(tasks);
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);

    const firstPage = await provider.listResources();
    expect(firstPage.resources.some((r) => r.uri === 'ticktick://task/t54')).toBe(false);

    const contents = await provider.readResource('ticktick://task/t54');
    expect(contents).toBeDefined();
    expect(contents?.[0]?.uri).toBe('ticktick://task/t54');
  });

  it('readResource: чужая схема uri → undefined без обращения к facade', async () => {
    const facade = createMockFacade();
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);

    const contents = await provider.readResource('ticktick://project/p1');

    expect(contents).toBeUndefined();
    expect(facade.getAllTasks).not.toHaveBeenCalled();
  });

  it('readResource: несуществующий id своей схемы → undefined (не ошибка)', async () => {
    const facade = createMockFacade();
    facade.getAllTasks.mockResolvedValue([makeTask('t1', 'First task')]);
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);

    const contents = await provider.readResource('ticktick://task/does-not-exist');

    expect(contents).toBeUndefined();
  });

  it('readResource: ошибка facade сводится к undefined', async () => {
    const facade = createMockFacade();
    facade.getAllTasks.mockRejectedValue(new Error('network error'));
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);

    const contents = await provider.readResource('ticktick://task/t1');

    expect(contents).toBeUndefined();
  });

  it('listTemplates возвращает шаблон ticktick://task/{id}', async () => {
    const facade = createMockFacade();
    const provider = new TaskResourceProvider(facade as unknown as TickTickFacade);

    const templates = await provider.listTemplates();

    expect(templates).toEqual([
      expect.objectContaining({
        uriTemplate: 'ticktick://task/{id}',
        name: 'ticktick-task',
      }),
    ]);
  });
});
