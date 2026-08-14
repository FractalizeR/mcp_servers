/**
 * MCP Resources — публичный API (пакет 5.1.A плана модернизации).
 */

export type {
  ResourceProvider,
  ResourceListPage,
  McpResource,
  McpResourceTemplate,
  McpResourceContents,
  McpResourceTextContents,
  McpResourceBlobContents,
} from './resource-provider.js';
export { ResourceRegistry } from './resource-registry.js';
export {
  OpaqueCursorCodec,
  InvalidOpaqueCursorError,
  OPAQUE_CURSOR_VERSION_PREFIX,
} from './pagination/opaque-cursor.js';
export type { ResourceLinkContentBlock, ResourceLinkDescriptor } from './resource-link-content.js';
export { buildResourceLinkContentBlock } from './resource-link-content.js';
