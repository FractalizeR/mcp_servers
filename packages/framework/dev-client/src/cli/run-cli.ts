/**
 * Точка входа CLI-адаптера `mcp-dev`: разобрать argv, выполнить команду,
 * вернуть код возврата. Не завершает процесс сама — это дело вызывающего
 * (`bin/mcp-dev.ts`) и тестов.
 */

import { getActiveMasker } from '../secrets/index.js';
import type { CliIo } from './io.js';
import { parseCliArgs } from './parse-args.js';
import { runBatchCommand } from './run-batch-command.js';
import { runCallCommand } from './run-call.js';
import { runListCommand } from './run-list.js';
import type { RunCliDeps } from './session-context.js';

export type { CliIo } from './io.js';
export type { RunCliDeps } from './session-context.js';

export async function runCli(
  argv: readonly string[],
  io: CliIo,
  deps: RunCliDeps = {}
): Promise<number> {
  const parsed = parseCliArgs(argv, { writeOut: io.stdout, writeErr: io.stderr });
  if (parsed.outcome === 'exit') return parsed.code;

  try {
    switch (parsed.value.command) {
      case 'list':
        return await runListCommand(parsed.value, io, deps);
      case 'call':
        return await runCallCommand(parsed.value, io, deps);
      case 'batch':
        return await runBatchCommand(parsed.value, io, deps);
    }
  } catch (error) {
    // Непредвиденный отказ печатается здесь, а не в `bin/mcp-dev.ts`, чтобы код
    // возврата оставался в одном месте. Маскирование здесь работает потому, что
    // `getActiveMasker()` переживает `uninstallGuard()` (см. `process-guard.ts`):
    // `executeCalls`/`runListCommand` зовут `cleanup()` в `finally`, то есть
    // guard снят ДО того, как исключение долетит сюда.
    // `await` в ветках switch обязателен — без него отказ уходит в отклонённый
    // промис мимо этого catch.
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    io.stderr(`${getActiveMasker()(message)}\n`);
    return 1;
  }
}
