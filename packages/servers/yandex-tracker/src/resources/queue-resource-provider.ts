/**
 * `ResourceProvider` для очередей Трекера — схема `tracker://queue/{key}`
 * (пакет 5.1.C.tracker плана модернизации MCP 2026-07-28).
 *
 * В отличие от задач (см. `issue-resource-provider.ts`), очереди — ограниченное
 * и обозримое множество организации, поэтому `listResources()` их РЕАЛЬНО
 * перечисляет (постранично, через существующую курсорную пагинацию Трекера —
 * `facade.getQueues({ cursor })`). Курсор, который отдаёт Трекер в
 * `pagination.nextCursor`, ре-экспортируется как `nextCursor` страницы
 * `ResourceProvider` буквально как есть: `ResourceRegistry` трактует его как
 * непрозрачную строку конкретного провайдера, поэтому заворачивать его в
 * ещё один слой кодирования незачем — тот же приём справедлив для
 * `project-resource-provider.ts`.
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
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import {
  buildQueueResourceUri,
  parseQueueResourceUri,
  QUEUE_URI_TEMPLATE,
} from './tracker-resource-uri.js';
import { buildJsonResourceContents } from './json-resource-contents.util.js';

function toMcpResource(queue: QueueWithUnknownFields): McpResource {
  return {
    uri: buildQueueResourceUri(queue.key),
    name: queue.key,
    title: queue.name,
    description: `Очередь Трекера «${queue.name}» (${queue.key})`,
    mimeType: 'application/json',
  };
}

export class QueueResourceProvider implements ResourceProvider {
  public readonly id = 'tracker-queues';

  constructor(private readonly facade: YandexTrackerFacade) {}

  async listResources(cursor?: string): Promise<ResourceListPage> {
    const result = await this.facade.getQueues(cursor !== undefined ? { cursor } : undefined);
    return {
      resources: result.items.map(toMcpResource),
      ...(result.pagination.nextCursor !== undefined
        ? { nextCursor: result.pagination.nextCursor }
        : {}),
    };
  }

  async readResource(uri: string): Promise<readonly McpResourceContents[] | undefined> {
    const queueKey = parseQueueResourceUri(uri);
    if (queueKey === undefined) {
      return undefined;
    }

    try {
      const queue = await this.facade.getQueue({ queueId: queueKey });
      return buildJsonResourceContents(uri, queue);
    } catch (error) {
      // 404 → «такого URI нет» (не ошибка уровня провайдера, см. контракт
      // readResource); любая другая ошибка пробрасывается как есть.
      if (error instanceof ApiErrorClass && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  listTemplates(): readonly McpResourceTemplate[] {
    return [
      {
        uriTemplate: QUEUE_URI_TEMPLATE,
        name: 'tracker-queue',
        title: 'Очередь Трекера',
        description: 'Очередь Яндекс.Трекера по ключу (например, PROJ), полное содержимое (JSON)',
        mimeType: 'application/json',
      },
    ];
  }
}
