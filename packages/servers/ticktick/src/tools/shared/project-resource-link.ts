/**
 * `ResourceLinkDescriptor` для проектов TickTick (пакет 5.1.C.ticktick плана
 * модернизации MCP 2026-07-28) — см. `task-resource-link.ts` за общим
 * обоснованием, зеркалирует его для схемы `ticktick://project/{id}`.
 */

import type { ResourceLinkDescriptor } from '@fractalizer/mcp-core';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/index.js';
import { buildProjectResourceUri } from '#resources/index.js';

/**
 * Построить дескриптор `resource_link` для одного проекта.
 * `name`/`title` — та же конвенция, что и в `task-resource-link.ts`: `name`
 * держит машиночитаемый `project.id`, человекочитаемое имя — только в `title`.
 */
export function buildProjectResourceLink(
  project: ProjectWithUnknownFields
): ResourceLinkDescriptor {
  return {
    uri: buildProjectResourceUri(project.id),
    name: project.id,
    ...(project.name ? { title: project.name } : {}),
    mimeType: 'application/json',
  };
}
