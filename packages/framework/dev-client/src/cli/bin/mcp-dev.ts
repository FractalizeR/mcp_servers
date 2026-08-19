#!/usr/bin/env node

/**
 * Исполняемый вход `mcp-dev` (см. `package.json` → `bin`).
 *
 * Никакой логики здесь: разбор аргументов и исполнение — в `run-cli.ts`,
 * это только связка с реальным `process.stdout`/`process.stderr`.
 *
 * Код возврата выставляется через `process.exitCode`, а не `process.exit()`:
 * когда stdout — pipe (а вывод `mcp-dev` читает именно агент через pipe),
 * запись асинхронна, и немедленный `exit()` обрывает процесс до слива буфера —
 * хвост JSONL теряется при внешне корректном коде возврата.
 */

import { getActiveMasker } from '../../secrets/index.js';
import { runCli } from '../run-cli.js';

async function main(): Promise<void> {
  process.exitCode = await runCli(process.argv, {
    stdout: (text: string): void => {
      process.stdout.write(text);
    },
    stderr: (text: string): void => {
      process.stderr.write(text);
    },
  });
}

main().catch((error: unknown) => {
  // Последний рубеж: `runCli` уже маскирует всё, до чего дотягивается, но
  // исключение может прилететь и мимо него. Печатаем через активный маскер
  // (тождественный, если контур секретов ещё/уже не установлен).
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${getActiveMasker()(message)}\n`);
  process.exitCode = 1;
});
