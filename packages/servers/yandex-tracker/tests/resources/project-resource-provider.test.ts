/**
 * Unit-тесты ProjectResourceProvider (пакет 5.1.C.tracker плана модернизации
 * MCP 2026-07-28).
 */

import { describe, it, expect, vi } from 'vitest';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { ProjectResourceProvider } from '#resources/project-resource-provider.js';
import { buildProjectResourceUri } from '#resources/tracker-resource-uri.js';
import { createProjectListFixture, createProjectFixture } from '#helpers/project.fixture.js';
import type { PaginatedResult, ProjectWithUnknownFields } from '#tracker_api/entities/index.js';

function page(
  items: ProjectWithUnknownFields[],
  nextCursor?: string
): PaginatedResult<ProjectWithUnknownFields> {
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
    getProjects: vi.fn(),
    getProject: vi.fn(),
    ...overrides,
  } as unknown as YandexTrackerFacade;
}

describe('ProjectResourceProvider', () => {
  it('id === "tracker-projects"', () => {
    expect(new ProjectResourceProvider(makeFacade()).id).toBe('tracker-projects');
  });

  it('listResources() перечисляет проекты, uri построен по id (не key)', async () => {
    const projects = createProjectListFixture(2);
    const getProjects = vi.fn().mockResolvedValue(page(projects));
    const provider = new ProjectResourceProvider(makeFacade({ getProjects }));

    const result = await provider.listResources();

    expect(result.resources).toHaveLength(2);
    expect(result.resources[0]).toMatchObject({
      uri: buildProjectResourceUri(projects[0]!.id),
      name: projects[0]!.key,
      title: projects[0]!.name,
    });
    expect(result.nextCursor).toBeUndefined();
  });

  it('listResources(cursor) передаёт курсор в facade.getProjects', async () => {
    const getProjects = vi.fn().mockResolvedValue(page([]));
    const provider = new ProjectResourceProvider(makeFacade({ getProjects }));

    await provider.listResources('c1:cursor');

    expect(getProjects).toHaveBeenCalledWith({ cursor: 'c1:cursor' });
  });

  it('readResource() читает проект по id, отсутствующему в listResources', async () => {
    const project = createProjectFixture({ id: 'hidden-id', key: 'HIDDEN' });
    const getProject = vi.fn().mockResolvedValue(project);
    const provider = new ProjectResourceProvider(makeFacade({ getProject }));

    const uri = buildProjectResourceUri('hidden-id');
    const contents = await provider.readResource(uri);

    expect(getProject).toHaveBeenCalledWith({ projectId: 'hidden-id' });
    expect(contents).toHaveLength(1);
    expect(JSON.parse((contents?.[0] as { text: string }).text)).toEqual(project);
  });

  it('readResource() возвращает undefined для чужой схемы URI', async () => {
    const provider = new ProjectResourceProvider(makeFacade());
    expect(await provider.readResource('tracker://queue/QUEUE')).toBeUndefined();
  });

  it('readResource() возвращает undefined на 404', async () => {
    const getProject = vi.fn().mockRejectedValue(new ApiErrorClass(404, 'Not found'));
    const provider = new ProjectResourceProvider(makeFacade({ getProject }));

    expect(await provider.readResource(buildProjectResourceUri('nope'))).toBeUndefined();
  });

  it('readResource() пробрасывает НЕ-404 ошибку', async () => {
    const getProject = vi.fn().mockRejectedValue(new ApiErrorClass(500, 'Internal error'));
    const provider = new ProjectResourceProvider(makeFacade({ getProject }));

    await expect(provider.readResource(buildProjectResourceUri('boom'))).rejects.toThrow(
      'Internal error'
    );
  });

  it('listTemplates() отдаёт один шаблон tracker://project/{id}', async () => {
    const templates = await new ProjectResourceProvider(makeFacade()).listTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0]?.uriTemplate).toBe('tracker://project/{id}');
  });
});
