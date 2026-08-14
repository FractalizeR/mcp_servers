/**
 * `ResourceProvider` для проектов Трекера — схема `tracker://project/{id}`
 * (пакет 5.1.C.tracker плана модернизации MCP 2026-07-28).
 *
 * URI использует `project.id` (а не `project.key`) — так задано планом:
 * один проект = один канонический адрес по числовому ID, устойчивому даже
 * если ключ переименуют. `facade.getProject({ projectId })` принимает и
 * ID, и ключ (см. `GetProjectParams`), поэтому чтение по ID работает без
 * дополнительного маппинга.
 *
 * Как и очереди, проекты — ограниченное множество организации: `listResources()`
 * реально перечисляет их через существующую курсорную пагинацию Трекера.
 */

import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type {
  ResourceProvider,
  ResourceListPage,
  McpResource,
  McpResourceContents,
  McpResourceTemplate,
} from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import {
  buildProjectResourceUri,
  parseProjectResourceUri,
  PROJECT_URI_TEMPLATE,
} from './tracker-resource-uri.js';
import { buildJsonResourceContents } from './json-resource-contents.util.js';

function toMcpResource(project: ProjectWithUnknownFields): McpResource {
  return {
    uri: buildProjectResourceUri(project.id),
    name: project.key,
    title: project.name,
    description: `Проект Трекера «${project.name}» (${project.key})`,
    mimeType: 'application/json',
  };
}

export class ProjectResourceProvider implements ResourceProvider {
  public readonly id = 'tracker-projects';

  constructor(private readonly facade: YandexTrackerFacade) {}

  async listResources(cursor?: string): Promise<ResourceListPage> {
    const result = await this.facade.getProjects(cursor !== undefined ? { cursor } : undefined);
    return {
      resources: result.items.map(toMcpResource),
      ...(result.pagination.nextCursor !== undefined
        ? { nextCursor: result.pagination.nextCursor }
        : {}),
    };
  }

  async readResource(uri: string): Promise<readonly McpResourceContents[] | undefined> {
    const projectId = parseProjectResourceUri(uri);
    if (projectId === undefined) {
      return undefined;
    }

    try {
      const project = await this.facade.getProject({ projectId });
      return buildJsonResourceContents(uri, project);
    } catch (error) {
      if (error instanceof ApiErrorClass && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  listTemplates(): readonly McpResourceTemplate[] {
    return [
      {
        uriTemplate: PROJECT_URI_TEMPLATE,
        name: 'tracker-project',
        title: 'Проект Трекера',
        description: 'Проект Яндекс.Трекера по ID, полное содержимое (JSON)',
        mimeType: 'application/json',
      },
    ];
  }
}
