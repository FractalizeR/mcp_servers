/**
 * `ResourceProvider` для проектов TickTick (пакет 5.1.C.ticktick плана
 * модернизации MCP 2026-07-28).
 *
 * Схема URI — `ticktick://project/{id}`, спроектирована планом (раздел 5.1.B).
 *
 * В отличие от задач (`task-resource.provider.ts`), API TickTick даёт прямой
 * `GET /project/{projectId}` по одному идентификатору (`GetProjectOperation`),
 * поэтому `readResource` не нуждается в агрегировании через список всех
 * проектов — читает ОДИН проект напрямую, дешевле и точнее (в частности,
 * различает «проект не существует» от «проект существует, но не входит в
 * текущую страницу listResources» без полного обхода).
 */

import type {
  ResourceProvider,
  ResourceListPage,
  McpResource,
  McpResourceContents,
  McpResourceTemplate,
} from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/index.js';
import { paginateOffset } from './pagination.js';

/** Размер страницы `resources/list` этого провайдера. */
const PAGE_SIZE = 50;

/** Префикс схемы URI проектов TickTick. */
const PROJECT_URI_PREFIX = 'ticktick://project/';

/** Построить URI ресурса проекта по его идентификатору. */
export function buildProjectResourceUri(projectId: string): string {
  return `${PROJECT_URI_PREFIX}${encodeURIComponent(projectId)}`;
}

/**
 * Распарсить `id` проекта из URI своей схемы.
 *
 * @returns `id`, либо `undefined`, если `uri` не принадлежит схеме
 *   `ticktick://project/{id}` этого провайдера.
 */
function parseProjectId(uri: string): string | undefined {
  if (!uri.startsWith(PROJECT_URI_PREFIX)) {
    return undefined;
  }
  const rawId = uri.slice(PROJECT_URI_PREFIX.length);
  if (rawId.length === 0) {
    return undefined;
  }
  return decodeURIComponent(rawId);
}

function toMcpResource(project: ProjectWithUnknownFields): McpResource {
  // Та же конвенция, что и в task-resource.provider.ts: name — id, title — имя.
  return {
    uri: buildProjectResourceUri(project.id),
    name: project.id,
    ...(project.name ? { title: project.name } : {}),
    mimeType: 'application/json',
  };
}

function toMcpResourceContents(project: ProjectWithUnknownFields): McpResourceContents {
  return {
    uri: buildProjectResourceUri(project.id),
    mimeType: 'application/json',
    text: JSON.stringify(project, null, 2),
  };
}

export class ProjectResourceProvider implements ResourceProvider {
  public readonly id = 'ticktick-projects';

  constructor(private readonly facade: TickTickFacade) {}

  async listResources(cursor?: string): Promise<ResourceListPage> {
    const projects = await this.facade.getProjects();
    const page = paginateOffset(projects, cursor, PAGE_SIZE);

    return {
      resources: page.items.map(toMcpResource),
      ...(page.nextCursor !== undefined ? { nextCursor: page.nextCursor } : {}),
    };
  }

  async readResource(uri: string): Promise<readonly McpResourceContents[] | undefined> {
    const projectId = parseProjectId(uri);
    if (projectId === undefined) {
      return undefined;
    }

    // "Проекта с таким id нет" и "ошибка при обращении к API" здесь
    // неразличимы без разбора конкретного класса ошибки — оба случая
    // сводятся к `undefined`, тот же выбор, что и в TaskResourceProvider
    // (см. его заголовок за подробным обоснованием).
    try {
      const project = await this.facade.getProject(projectId);
      return [toMcpResourceContents(project)];
    } catch {
      return undefined;
    }
  }

  listTemplates(): readonly McpResourceTemplate[] {
    return [
      {
        uriTemplate: `${PROJECT_URI_PREFIX}{id}`,
        name: 'ticktick-project',
        title: 'Проект TickTick',
        description: 'Один проект (список) TickTick по его идентификатору',
        mimeType: 'application/json',
      },
    ];
  }
}
