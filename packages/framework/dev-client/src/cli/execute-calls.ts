/**
 * Общая машинерия исполнения вызовов — используется и `call`, и `batch`
 * (`call` строит список из одного вызова и передаёт сюда же, см. `run-call.ts`
 * и README плана: «call — частный случай батча из одной строки, отдельного
 * пути исполнения нет»).
 *
 * Порядок отказов соответствует README плана, разделу «Порядок проверок и
 * отказов»: политика записи проверяется по всему батчу разом, до первого
 * `tools/call` (шаг 3), неизвестный инструмент — deny-by-default (шаг 4,
 * реализован внутри `assertAllowed`).
 */

import type {
  BatchCall,
  BatchCallOutcome,
  CallToolSession,
  RunBatchOptions,
} from '../batch/index.js';
import { runBatch } from '../batch/index.js';
import { assertAllowed, WritePolicyError } from '../write-policy/index.js';
import type { Masker } from '../secrets/index.js';
import type { CliIo } from './io.js';
import { describeError } from './io.js';
import { openSessionContext, type RunCliDeps } from './session-context.js';
import type { GlobalCliOptions } from './types.js';

export interface ExecuteCallsOptions {
  readonly allowWrite: boolean;
  readonly stopOnError: boolean;
  readonly pauseMs: number;
  readonly timeoutMs: number;
}

/** Единый параметр {@link executeCalls} — держит сигнатуру в пределах `max-params` линтера. */
export interface ExecuteCallsRequest {
  readonly global: GlobalCliOptions;
  readonly calls: readonly BatchCall[];
  readonly options: ExecuteCallsOptions;
  readonly io: CliIo;
  readonly deps: RunCliDeps;
}

/** Строка результата — провал в терминах кода возврата CLI (не сработала, expect не сошёлся, неожиданный isError). */
function resultIsFailure(result: BatchCallOutcome): boolean {
  if (result.ran !== true) return true;
  if (result.expectationMet === false) return true;
  if (result.expectationMet === undefined && result.isError === true) return true;
  return false;
}

function buildSkippedOutcome(call: BatchCall): BatchCallOutcome {
  return {
    line: call.line,
    ...(call.label !== undefined ? { label: call.label } : {}),
    tool: call.tool,
    ran: false,
    skipReason: 'stopOnError',
  };
}

/**
 * Прогнать вызовы по одному, останавливаясь на первом провале (`--stop-on-error`).
 *
 * Каждый вызов идёт через тот же `runBatch` (список из одного элемента) — не
 * дублирует его логику вызова/маскирования/таймаута, только решает, продолжать
 * ли после каждого элемента.
 */
async function runStopOnError(
  session: CallToolSession,
  calls: readonly BatchCall[],
  masker: Masker,
  options: RunBatchOptions
): Promise<BatchCallOutcome[]> {
  const results: BatchCallOutcome[] = [];
  let stopped = false;

  for (const call of calls) {
    if (stopped) {
      results.push(buildSkippedOutcome(call));
      continue;
    }
    const single = await runBatch(session, [call], masker, options);
    const outcome = single.results[0];
    if (outcome) {
      results.push(outcome);
      if (resultIsFailure(outcome)) stopped = true;
    }
  }
  return results;
}

function printResults(io: CliIo, results: readonly BatchCallOutcome[]): void {
  for (const result of results) {
    io.stdout(`${JSON.stringify(result)}\n`);
  }
  const failed = results.filter(resultIsFailure).length;
  io.stderr(`mcp-dev: ${String(results.length)} вызов(ов), ${String(failed)} провал(ов)\n`);
}

/**
 * Открыть сессию, проверить политику записи по всему батчу разом, прогнать
 * вызовы, напечатать результаты.
 *
 * @returns Код возврата: `0` все ожидания сошлись, `1` есть провалы (включая
 *   отказ политики записи — `tools/call` в этом случае не отправляется вовсе),
 *   `2` сессия не открылась.
 */
export async function executeCalls(request: ExecuteCallsRequest): Promise<number> {
  const { global, calls, options, io, deps } = request;
  const opened = await openSessionContext(global, deps, options.allowWrite);
  if (opened.outcome === 'failed') {
    io.stderr(`${opened.message}\n`);
    return opened.exitCode;
  }

  const { context, cleanup } = opened;
  try {
    try {
      assertAllowed(context.tools, calls, options.allowWrite);
    } catch (error) {
      const message = error instanceof WritePolicyError ? error.message : describeError(error);
      io.stderr(`${context.masker(message)}\n`);
      return 1;
    }

    const runOptions: RunBatchOptions = { timeoutMs: options.timeoutMs, pauseMs: options.pauseMs };
    const results = options.stopOnError
      ? await runStopOnError(context.session, calls, context.masker, runOptions)
      : (await runBatch(context.session, calls, context.masker, runOptions)).results;

    printResults(io, results);
    return results.some(resultIsFailure) ? 1 : 0;
  } finally {
    await cleanup();
  }
}
