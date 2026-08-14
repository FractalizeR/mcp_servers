/**
 * `PromptProvider` для Трекера — агрегирует 4 промпта плана (5.1.C.tracker):
 * triage очереди, дейли-сводка, сводка по проекту, разбор связей эпика.
 *
 * `listPrompts()`/`getPrompt()` — тонкая обёртка над массивом
 * `TrackerPromptDefinition` (см. tracker-prompt.types.ts): порядок массива —
 * порядок в `prompts/list` (контракт `PromptProvider.listPrompts` требует
 * детерминированный порядок между вызовами — литеральный массив, не
 * `Map`/`Object.entries`).
 */

import type { PromptProvider, McpPrompt, PromptGetResult } from '@fractalizer/mcp-core';
import type { TrackerPromptDefinition } from './tracker-prompt.types.js';
import { triageQueuePrompt } from './triage-queue.prompt.js';
import { dailySummaryPrompt } from './daily-summary.prompt.js';
import { projectSummaryPrompt } from './project-summary.prompt.js';
import { epicLinksPrompt } from './epic-links.prompt.js';

const TRACKER_PROMPTS: readonly TrackerPromptDefinition[] = [
  triageQueuePrompt,
  dailySummaryPrompt,
  projectSummaryPrompt,
  epicLinksPrompt,
];

export class TrackerPromptProvider implements PromptProvider {
  public readonly id = 'tracker-prompts';

  listPrompts(): readonly McpPrompt[] {
    return TRACKER_PROMPTS.map((p) => p.prompt);
  }

  getPrompt(name: string, args?: Readonly<Record<string, string>>): PromptGetResult | undefined {
    const definition = TRACKER_PROMPTS.find((p) => p.prompt.name === name);
    if (definition === undefined) {
      return undefined;
    }
    return definition.build(args);
  }
}
