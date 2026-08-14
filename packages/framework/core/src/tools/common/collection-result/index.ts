/**
 * Механизм ответа инструментов-коллекций: сводка + `resource_link` вместо
 * полных тел (пакет 5.1.B плана модернизации MCP 2026-07-28).
 *
 * Используется через `BaseTool.formatCollectionResult()` (см.
 * `../../base/base-tool.ts`) — этот барель экспортирует только
 * вспомогательные типы/схемы, которые инструменту нужны САМОМУ:
 * параметр `responseMode` (`collectionResponseModeParamSchema`) и, если
 * инструмент строит собственный `outputSchema`, `buildCollectionOutputSchema`.
 */

export {
  DEFAULT_COLLECTION_LINKS_THRESHOLD,
  CollectionResponseModeSchema,
  resolveCollectionResponseMode,
  collectionResponseModeParamSchema,
} from './collection-response-mode.js';
export type {
  CollectionResponseMode,
  ResolvedCollectionResponseMode,
} from './collection-response-mode.js';

export { buildCollectionOutputSchema, ResourceLinkDataSchema } from './collection-output-schema.js';
