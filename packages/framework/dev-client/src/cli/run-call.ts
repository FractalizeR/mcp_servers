/**
 * Команда `call` — частный случай `batch` из одной строки (см. README плана).
 * Строит ту же JSONL-строку, что писал бы пользователь в файл батча, и
 * разбирает её тем же `parseBatch` — гарантия «нет отдельного пути исполнения»
 * буквальна, а не только по описанию.
 */

import { parseBatch } from '../batch/index.js';
import { executeCalls } from './execute-calls.js';
import type { CliIo } from './io.js';
import { readToolArgs } from './read-tool-args.js';
import type { RunCliDeps } from './session-context.js';
import type { CallCliCommand } from './types.js';

const DEFAULT_CALL_TIMEOUT_MS = 30_000;

export async function runCallCommand(
  cmd: CallCliCommand,
  io: CliIo,
  deps: RunCliDeps
): Promise<number> {
  const argsResult = await readToolArgs(cmd.argsInput);
  if (argsResult.outcome !== 'ok') {
    io.stderr(`${argsResult.message}\n`);
    return 1;
  }

  const line = JSON.stringify({ tool: cmd.tool, args: argsResult.args });
  const parsed = parseBatch(line);
  if (parsed.outcome !== 'ok') {
    // Недостижимо на практике: строка выше всегда синтаксически валидна и
    // проходит форму BatchCall. Оставлено как защита от рассинхронизации
    // с ужесточением валидации parseBatch в будущем — без неё TS не даёт
    // сузить тип parsed.calls ниже.
    io.stderr(`Не удалось собрать вызов инструмента "${cmd.tool}"\n`);
    return 1;
  }

  return executeCalls({
    global: cmd.global,
    calls: parsed.calls,
    options: {
      allowWrite: cmd.allowWrite,
      stopOnError: false,
      pauseMs: 0,
      timeoutMs: DEFAULT_CALL_TIMEOUT_MS,
    },
    io,
    deps,
  });
}
