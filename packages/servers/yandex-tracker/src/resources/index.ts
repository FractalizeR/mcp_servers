/**
 * MCP Resources Трекера — публичный API модуля (пакет 5.1.C.tracker плана
 * модернизации MCP 2026-07-28).
 *
 * `createTrackerResourceRegistry()` — единственная точка сборки: composition
 * root (`#composition-root/container.js`) вызывает её с готовым `facade` и
 * получает `ResourceRegistry`, готовый к передаче в `createMcpServerAdapter`.
 */

import { ResourceRegistry } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { IssueResourceProvider } from './issue-resource-provider.js';
import { QueueResourceProvider } from './queue-resource-provider.js';
import { ProjectResourceProvider } from './project-resource-provider.js';

export function createTrackerResourceRegistry(facade: YandexTrackerFacade): ResourceRegistry {
  const registry = new ResourceRegistry();
  registry.register(new IssueResourceProvider(facade));
  registry.register(new QueueResourceProvider(facade));
  registry.register(new ProjectResourceProvider(facade));
  return registry;
}

export { IssueResourceProvider } from './issue-resource-provider.js';
export { QueueResourceProvider } from './queue-resource-provider.js';
export { ProjectResourceProvider } from './project-resource-provider.js';
export {
  buildIssueResourceUri,
  parseIssueResourceUri,
  buildQueueResourceUri,
  parseQueueResourceUri,
  buildProjectResourceUri,
  parseProjectResourceUri,
  ISSUE_URI_TEMPLATE,
  QUEUE_URI_TEMPLATE,
  PROJECT_URI_TEMPLATE,
} from './tracker-resource-uri.js';
