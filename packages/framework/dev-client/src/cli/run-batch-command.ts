/**
 * Команда `batch`: прочитать JSONL-файл, разобрать, прогнать в одной сессии.
 *
 * Пустой батч и битые строки обрабатываются до открытия сессии — нет смысла
 * резолвить секреты/бандл и спавнить процесс сервера ради файла, который
 * заведомо не даст ни одного вызова (см. README плана, раздел «Кейсы и
 * граничные условия»).
 */

import * as fs from 'node:fs/promises';
import { parseBatch } from '../batch/index.js';
import { executeCalls } from './execute-calls.js';
import { describeError, type CliIo } from './io.js';
import type { RunCliDeps } from './session-context.js';
import type { BatchCliCommand } from './types.js';

export async function runBatchCommand(
  cmd: BatchCliCommand,
  io: CliIo,
  deps: RunCliDeps
): Promise<number> {
  let source: string;
  try {
    source = await fs.readFile(cmd.batchFile, 'utf-8');
  } catch (error) {
    io.stderr(`Не удалось прочитать файл батча "${cmd.batchFile}": ${describeError(error)}\n`);
    return 1;
  }

  const parsed = parseBatch(source);
  if (parsed.outcome === 'empty') {
    io.stderr('Батч пуст: вызовов нет.\n');
    return 0;
  }
  if (parsed.outcome === 'invalid') {
    for (const parseError of parsed.errors) {
      io.stderr(`Строка ${String(parseError.line)}: ${parseError.message}\n`);
    }
    return 1;
  }

  return executeCalls({
    global: cmd.global,
    calls: parsed.calls,
    options: {
      allowWrite: cmd.allowWrite,
      stopOnError: cmd.stopOnError,
      pauseMs: cmd.delayMs,
      timeoutMs: cmd.callTimeoutMs,
    },
    io,
    deps,
  });
}
