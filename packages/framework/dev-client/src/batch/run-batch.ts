/**
 * Прогон батча в одной открытой сессии + агрегация.
 *
 * Различает три независимых наблюдаемых исхода вызова:
 *  - инструмент ответил `isError: true` (обычный MCP-результат ошибки —
 *    например, невалидные аргументы) — батч продолжается;
 *  - вызов не уложился в таймаут строки — строка помечается провалившейся
 *    (`ran: false`, `timedOut: true`), но батч продолжается: медленный или
 *    зависший на одном запросе инструмент не означает, что сервер недоступен,
 *    а обрывать из-за него остаток батча — терять уже оплаченный handshake;
 *  - `callTool` бросил исключение (транспорт/процесс недоступен — сервер
 *    упал) — батч останавливается, остаток помечается `ran: false` с
 *    `skipReason: 'serverDown'`.
 *
 * Маскирование применяется **до** сборки `BatchCallOutcome` (который потом
 * сериализуется в JSONL вызывающим CLI-слоем) — см. `secrets/masker.ts`,
 * `maskJsonValue`: если сериализовать сначала и искать секрет уже в
 * JSON-тексте, экранирование в `JSON.stringify` изменит байты значения и
 * строковый поиск подстроки-секрета его не найдёт.
 */

import type { CallToolResult, JSONObject } from '@modelcontextprotocol/client';
import { maskJsonValue, type Masker } from '../secrets/masker.js';
import type { BatchCall, BatchCallOutcome, BatchExpectation, BatchOutcome } from './types.js';

/**
 * Минимальная поверхность {@link DevSession}, нужная для прогона батча —
 * не сама конкретная (`private constructor`) сессия, а её узкий контракт.
 * Отдельная от `DevSession` точка внедрения: тест подставляет заглушку без
 * реального handshake/спавна процесса (требование пакета — см. README плана,
 * раздел «Тестируемость»); `DevSession` эту поверхность реализует структурно.
 */
export interface CallToolSession {
  callTool(name: string, args: JSONObject): Promise<CallToolResult>;
}

/** Опции {@link runBatch}. */
export interface RunBatchOptions {
  /** Таймаут одного вызова (мс). По умолчанию 30с. */
  readonly timeoutMs?: number;
  /** Пауза между вызовами (мс) — смягчение rate limit боевого сервиса. По умолчанию 0. */
  readonly pauseMs?: number;
}

const DEFAULT_PER_CALL_TIMEOUT_MS = 30_000;
const DEFAULT_PAUSE_MS = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Таймаут одной строки батча — отличим от сбоя транспорта (`instanceof`). */
export class CallTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`Таймаут: ${label} превысил ${String(ms)}ms`);
    this.name = 'CallTimeoutError';
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new CallTimeoutError(label, ms));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function extractTextContent(result: CallToolResult): string {
  const blocks = (result.content ?? []) as ReadonlyArray<{ type?: string; text?: string }>;
  return blocks
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n');
}

function evaluateExpectation(
  expect: BatchExpectation | undefined,
  result: CallToolResult
): boolean | undefined {
  if (!expect) return undefined;
  let met = true;
  if (expect.isError !== undefined) {
    met = met && (result.isError === true) === expect.isError;
  }
  if (expect.contains !== undefined) {
    met = met && extractTextContent(result).includes(expect.contains);
  }
  return met;
}

function buildSuccessOutcome(
  call: BatchCall,
  result: CallToolResult,
  durationMs: number,
  masker: Masker
): BatchCallOutcome {
  const expectationMet = evaluateExpectation(call.expect, result);
  return {
    line: call.line,
    ...(call.label !== undefined ? { label: call.label } : {}),
    tool: call.tool,
    ran: true,
    isError: result.isError === true,
    content: maskJsonValue(result.content, masker),
    ...(result.structuredContent !== undefined
      ? { structuredContent: maskJsonValue(result.structuredContent, masker) }
      : {}),
    durationMs,
    ...(expectationMet !== undefined ? { expectationMet } : {}),
  };
}

function buildFailureOutcome(call: BatchCall, error: unknown, masker: Masker): BatchCallOutcome {
  const message = error instanceof Error ? error.message : String(error);
  return {
    line: call.line,
    ...(call.label !== undefined ? { label: call.label } : {}),
    tool: call.tool,
    ran: false,
    ...(error instanceof CallTimeoutError ? { timedOut: true } : {}),
    error: masker(message),
  };
}

function buildSkippedOutcome(call: BatchCall): BatchCallOutcome {
  return {
    line: call.line,
    ...(call.label !== undefined ? { label: call.label } : {}),
    tool: call.tool,
    ran: false,
    skipReason: 'serverDown',
  };
}

/**
 * Прогнать список вызовов в уже открытой сессии.
 *
 * Политика допуска (`assertAllowed`) должна быть проверена вызывающим кодом
 * **до** вызова `runBatch` — здесь она не повторяется: разделение
 * ответственности яснее, чем протаскивать флаг допуска через сигнатуру
 * функции, которая уже получает только то, что имеет право выполнить.
 */
export async function runBatch(
  session: CallToolSession,
  calls: readonly BatchCall[],
  masker: Masker,
  options: RunBatchOptions = {}
): Promise<BatchOutcome> {
  const perCallTimeoutMs = options.timeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS;
  const pauseMs = options.pauseMs ?? DEFAULT_PAUSE_MS;

  const results: BatchCallOutcome[] = [];
  let serverDown = false;

  for (const call of calls) {
    if (serverDown) {
      results.push(buildSkippedOutcome(call));
      continue;
    }

    const startedAt = Date.now();
    try {
      const result = await withTimeout(
        session.callTool(call.tool, call.args),
        perCallTimeoutMs,
        `tools/call ${call.tool}`
      );
      results.push(buildSuccessOutcome(call, result, Date.now() - startedAt, masker));
    } catch (error) {
      // Только сбой транспорта/сессии означает «сервер недоступен». Таймаут
      // одной строки — провал этой строки, а не приговор остатку батча.
      if (!(error instanceof CallTimeoutError)) serverDown = true;
      results.push(buildFailureOutcome(call, error, masker));
    }

    if (pauseMs > 0 && !serverDown) {
      await delay(pauseMs);
    }
  }

  // Строка засчитывается только если она реально отработала и её `expect`
  // (если задан) сошёлся. Прежняя формула (`r.ran !== true || ...`) считала
  // выполненными и пропущенные из-за падения сервера, и вышедшие за таймаут:
  // батч из двух подряд таймаутов давал `allExpectationsMet: true` — ровно
  // противоположное тому, что обещает `BatchOutcome`.
  const allExpectationsMet = results.every((r) => r.ran === true && r.expectationMet !== false);
  return { results, allExpectationsMet };
}
