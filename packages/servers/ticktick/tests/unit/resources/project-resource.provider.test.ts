/**
 * Unit tests for ProjectResourceProvider (пакет 5.1.C.ticktick)
 */

import { describe, it, expect } from 'vitest';
import { ProjectResourceProvider } from '#resources/project-resource.provider.js';
import { createMockFacade } from '#helpers/index.js';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/index.js';

function makeProject(id: string, name: string): ProjectWithUnknownFields {
  return { id, name };
}

describe('ProjectResourceProvider', () => {
  it('имеет стабильный id провайдера', () => {
    const facade = createMockFacade();
    const provider = new ProjectResourceProvider(facade as unknown as TickTickFacade);
    expect(provider.id).toBe('ticktick-projects');
  });

  it('listResources возвращает проекты как McpResource с uri схемы ticktick://project/{id}', async () => {
    const facade = createMockFacade();
    facade.getProjects.mockResolvedValue([makeProject('p1', 'Inbox')]);
    const provider = new ProjectResourceProvider(facade as unknown as TickTickFacade);

    const page = await provider.listResources();

    expect(page.resources).toEqual([
      { uri: 'ticktick://project/p1', name: 'p1', title: 'Inbox', mimeType: 'application/json' },
    ]);
    expect(page.nextCursor).toBeUndefined();
  });

  it('readResource по uri из listResources читает проект напрямую через facade.getProject (без полного обхода)', async () => {
    const facade = createMockFacade();
    facade.getProject.mockResolvedValue(makeProject('p1', 'Inbox'));
    const provider = new ProjectResourceProvider(facade as unknown as TickTickFacade);

    const contents = await provider.readResource('ticktick://project/p1');

    expect(facade.getProject).toHaveBeenCalledWith('p1');
    expect(facade.getProjects).not.toHaveBeenCalled();
    expect(contents).toBeDefined();
    expect(contents?.[0]?.uri).toBe('ticktick://project/p1');
    expect(JSON.parse((contents?.[0] as { text: string }).text)).toMatchObject({
      id: 'p1',
      name: 'Inbox',
    });
  });

  it('readResource: uri ОТСУТСТВУЮЩИЙ в listResources тем не менее работает (прямой GET по id)', async () => {
    const facade = createMockFacade();
    // Проект p2 не участвует в listResources() вовсе в этом тесте — provider
    // обязан разрешить его напрямую по контракту ResourceProvider.
    facade.getProject.mockResolvedValue(makeProject('p2', 'Hidden project'));
    const provider = new ProjectResourceProvider(facade as unknown as TickTickFacade);

    const contents = await provider.readResource('ticktick://project/p2');

    expect(contents?.[0]?.uri).toBe('ticktick://project/p2');
  });

  it('readResource: чужая схема uri → undefined без обращения к facade', async () => {
    const facade = createMockFacade();
    const provider = new ProjectResourceProvider(facade as unknown as TickTickFacade);

    const contents = await provider.readResource('ticktick://task/t1');

    expect(contents).toBeUndefined();
    expect(facade.getProject).not.toHaveBeenCalled();
  });

  it('readResource: ошибка facade (например, 404) сводится к undefined', async () => {
    const facade = createMockFacade();
    facade.getProject.mockRejectedValue(new Error('404 not found'));
    const provider = new ProjectResourceProvider(facade as unknown as TickTickFacade);

    const contents = await provider.readResource('ticktick://project/does-not-exist');

    expect(contents).toBeUndefined();
  });

  it('listTemplates возвращает шаблон ticktick://project/{id}', async () => {
    const facade = createMockFacade();
    const provider = new ProjectResourceProvider(facade as unknown as TickTickFacade);

    const templates = await provider.listTemplates();

    expect(templates).toEqual([
      expect.objectContaining({
        uriTemplate: 'ticktick://project/{id}',
        name: 'ticktick-project',
      }),
    ]);
  });
});
