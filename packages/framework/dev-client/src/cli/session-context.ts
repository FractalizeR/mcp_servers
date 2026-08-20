/**
 * Открытие сессии + `listTools()` — общий пролог команд `list`/`call`/`batch`.
 *
 * Любой отказ здесь (резолв секретов/бандла, handshake, `listTools`) —
 * это «сессия не открылась» в терминах README плана → код возврата 2.
 * Отказ политики записи (`assertAllowed`) в этот код не входит: он
 * проверяется после успешного открытия сессии (см. `execute-calls.ts`).
 */

import type { DevSession } from '../session/index.js';
import { DevSession as DevSessionClass } from '../session/index.js';
import type { ToolSummary } from '../write-policy/index.js';
import type { Masker } from '../secrets/index.js';
import { describeError } from './io.js';
import { resolveLaunch } from './resolve-launch.js';
import type { RunCliDeps } from './resolve-launch.js';
import type { GlobalCliOptions } from './types.js';

export type { RunCliDeps } from './resolve-launch.js';

export interface SessionContext {
  readonly session: DevSession;
  readonly tools: readonly ToolSummary[];
  readonly masker: Masker;
}

export type OpenContextResult =
  | {
      readonly outcome: 'ok';
      readonly context: SessionContext;
      readonly cleanup: () => Promise<void>;
    }
  | { readonly outcome: 'failed'; readonly exitCode: 2; readonly message: string };

async function safeClose(session: DevSession): Promise<void> {
  try {
    await session.close();
  } catch {
    // Подавляем: закрытие уже недоступной/битой сессии не должно маскировать первопричину отказа.
  }
}

/** Открыть сессию против резолвнутого запуска и перечислить инструменты. */
export async function openSessionContext(
  global: GlobalCliOptions,
  deps: RunCliDeps,
  /** Прогон разрешает запись — объявляется серверу при запуске (см. `write-declaration.ts`). */
  allowWrite = false
): Promise<OpenContextResult> {
  const launchResult = await resolveLaunch(global, deps, allowWrite);
  if (launchResult.outcome === 'failed') {
    return { outcome: 'failed', exitCode: launchResult.exitCode, message: launchResult.message };
  }
  const { launch, masker, uninstallGuard } = launchResult;

  let session: DevSession;
  try {
    session = await DevSessionClass.open({
      launch,
      masker,
      ...(deps.transportFactory ? { transportFactory: deps.transportFactory } : {}),
    });
  } catch (error) {
    uninstallGuard();
    return { outcome: 'failed', exitCode: 2, message: masker(describeError(error)) };
  }

  let tools: ToolSummary[];
  try {
    tools = await session.listTools();
  } catch (error) {
    const message = masker(describeError(error));
    await safeClose(session);
    uninstallGuard();
    return { outcome: 'failed', exitCode: 2, message };
  }

  const cleanup = async (): Promise<void> => {
    await safeClose(session);
    uninstallGuard();
  };

  return { outcome: 'ok', context: { session, tools, masker }, cleanup };
}
