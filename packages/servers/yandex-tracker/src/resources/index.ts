/**
 * MCP Resources Трекера — публичный API модуля (пакет 5.1.C.tracker плана
 * модернизации MCP 2026-07-28).
 *
 * `createTrackerResourceRegistry()` — единственная точка сборки: composition
 * root (`#composition-root/container.js`) вызывает её с готовым `facade` и
 * именами инструментов, которые вызывает UI-виджет MCP Apps, и получает
 * `ResourceRegistry`, готовый к передаче в `createMcpServerAdapter`. Имена
 * приходят снаружи, чтобы `resources` не зависел от `tools`: обратное ребро
 * (`tools` → `#resources/apps-ui-uri.js`) уже существует.
 */

import { ResourceRegistry } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { IssueResourceProvider } from './issue-resource-provider.js';
import { QueueResourceProvider } from './queue-resource-provider.js';
import { IssueDescriptionEditorResourceProvider } from './issue-description-editor-resource-provider.js';
import type { IssueDescriptionEditorToolNames } from './issue-description-editor.widget.js';

export function createTrackerResourceRegistry(
  facade: YandexTrackerFacade,
  appToolNames: IssueDescriptionEditorToolNames
): ResourceRegistry {
  const registry = new ResourceRegistry();
  registry.register(new IssueResourceProvider(facade));
  registry.register(new QueueResourceProvider(facade));
  // Пилот №1 MCP Apps — статический UI-ресурс, без facade.
  registry.register(new IssueDescriptionEditorResourceProvider(appToolNames));
  return registry;
}

export { IssueResourceProvider } from './issue-resource-provider.js';
export { QueueResourceProvider } from './queue-resource-provider.js';
export { IssueDescriptionEditorResourceProvider } from './issue-description-editor-resource-provider.js';
export { ISSUE_DESCRIPTION_EDITOR_URI } from './apps-ui-uri.js';
export { buildIssueDescriptionEditorHtml } from './issue-description-editor.widget.js';
export type { IssueDescriptionEditorToolNames } from './issue-description-editor.widget.js';
export {
  buildIssueResourceUri,
  parseIssueResourceUri,
  buildQueueResourceUri,
  parseQueueResourceUri,
  ISSUE_URI_TEMPLATE,
  QUEUE_URI_TEMPLATE,
} from './tracker-resource-uri.js';
