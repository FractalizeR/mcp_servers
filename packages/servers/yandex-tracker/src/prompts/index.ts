/**
 * MCP Prompts Трекера — публичный API модуля (пакет 5.1.C.tracker плана
 * модернизации MCP 2026-07-28).
 *
 * `createTrackerPromptRegistry()` — единственная точка сборки: composition
 * root (`#composition-root/container.js`) зовёт её без аргументов (промпты
 * этой волны не зависят от facade — они строят ТЕКСТ инструкции агенту, а не
 * дергают API сами) и получает `PromptRegistry`, готовый к передаче в
 * `createMcpServerAdapter`.
 */

import { PromptRegistry } from '@fractalizer/mcp-core';
import { TrackerPromptProvider } from './tracker-prompt-provider.js';

export function createTrackerPromptRegistry(): PromptRegistry {
  const registry = new PromptRegistry();
  registry.register(new TrackerPromptProvider());
  return registry;
}

export { TrackerPromptProvider } from './tracker-prompt-provider.js';
export type { TrackerPromptDefinition } from './tracker-prompt.types.js';
export { requireArgs } from './tracker-prompt.types.js';
