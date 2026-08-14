/**
 * `ResourceLinkDescriptor` для задач TickTick (пакет 5.1.C.ticktick плана
 * модернизации MCP 2026-07-28) — используется инструментами-коллекциями
 * задач через `BaseTool.formatCollectionResult({ toResourceLink, ... })`
 * в режиме `links`. URI строится тем же `buildTaskResourceUri`, что и
 * `TaskResourceProvider` (`#resources/index.js`) — единственный источник
 * истины по форме URI один на оба направления (провайдер читает, тул ссылается).
 */

import type { ResourceLinkDescriptor } from '@fractalizer/mcp-core';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { buildTaskResourceUri } from '#resources/index.js';

/**
 * Построить дескриптор `resource_link` для одной задачи.
 *
 * `name` — машиночитаемый идентификатор (`McpResource.name`: "машиночитаемое
 * имя ресурса"), поэтому `task.id`, а не заголовок; `title` — отдельное
 * человекочитаемое поле для `task.title`. Дублировать заголовок в оба поля
 * не нужно — он и так один раз присутствует в `title`, а `name` держит
 * стабильный идентификатор, годный для сопоставления без парсинга URI.
 */
export function buildTaskResourceLink(task: TaskWithUnknownFields): ResourceLinkDescriptor {
  return {
    uri: buildTaskResourceUri(task.id),
    name: task.id,
    ...(task.title ? { title: task.title } : {}),
    mimeType: 'application/json',
  };
}
