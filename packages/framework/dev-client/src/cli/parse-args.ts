/**
 * Разбор argv в {@link ParsedCliCommand} через `commander`.
 *
 * `commander` выбран, а не новая зависимость: это уже стандарт разбора
 * аргументов в этом монорепо (см. `packages/servers/*\/src/cli/bin/mcp-connect.ts`).
 *
 * `exitOverride()` + `configureOutput()` — чтобы разбор был тестируемым:
 * без этого `commander` при ошибке/`--help` сам вызывает `process.exit()` и
 * пишет напрямую в `process.stdout`/`process.stderr`, что не даёт unit-тестам
 * проверить код возврата и текст без обрыва процесса тестраннера.
 */

import * as path from 'node:path';
import { Command, CommanderError } from 'commander';
import type {
  BatchCliCommand,
  CallCliCommand,
  ListCliCommand,
  ParseArgsOutcome,
  ParsedCliCommand,
} from './types.js';

const DEFAULT_DELAY_MS = 0;
const DEFAULT_CALL_TIMEOUT_MS = 30_000;

/** Функции записи вывода `commander` (перенаправляются на инъецируемый {@link CliIo}). */
export interface ParseArgsIo {
  readonly writeOut: (text: string) => void;
  readonly writeErr: (text: string) => void;
}

interface ListOpts {
  serverName: string;
  packageDir: string;
  json: boolean;
  writable: boolean;
}

interface CallOpts {
  serverName: string;
  packageDir: string;
  dangerouslyAllowWrite: boolean;
}

interface BatchOpts {
  serverName: string;
  packageDir: string;
  dangerouslyAllowWrite: boolean;
  stopOnError: boolean;
  delayMs: number;
  callTimeoutMs: number;
}

function globalOptions(opts: { serverName: string; packageDir: string }): {
  serverName: string;
  packageDir: string;
} {
  return { serverName: opts.serverName, packageDir: path.resolve(opts.packageDir) };
}

function parseNonNegativeInt(flagName: string): (value: string) => number {
  return (value: string): number => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${flagName} должен быть неотрицательным целым числом, получено: "${value}"`);
    }
    return parsed;
  };
}

function addGlobalOptions<T extends Command>(command: T): T {
  return command
    .requiredOption('--server-name <name>', 'Имя MCP-сервера (как в записи MCP-клиента)')
    .requiredOption('--package-dir <dir>', 'Каталог пакета сервера в текущем рабочем дереве') as T;
}

function registerListCommand(program: Command, onCommand: (cmd: ParsedCliCommand) => void): void {
  addGlobalOptions(
    program
      .command('list')
      .description('Показать инструменты сервера и их класс (read/write/local-side-effect)')
      .option('--json', 'Машинный вид (JSON-массив вместо текстовой таблицы)', false)
      .option(
        '--writable',
        'Показать только инструменты, требующие --dangerously-allow-write',
        false
      )
  ).action((opts: ListOpts) => {
    const cmd: ListCliCommand = {
      command: 'list',
      global: globalOptions(opts),
      json: opts.json,
      writableOnly: opts.writable,
    };
    onCommand(cmd);
  });
}

function registerCallCommand(program: Command, onCommand: (cmd: ParsedCliCommand) => void): void {
  addGlobalOptions(
    program
      .command('call <tool> <argsInput>')
      .description(
        'Вызвать один инструмент — частный случай batch из одной строки, отдельного пути исполнения нет'
      )
      .option(
        '--dangerously-allow-write',
        'Разрешить инструменты класса write/local-side-effect',
        false
      )
  ).action((tool: string, argsInput: string, opts: CallOpts) => {
    const cmd: CallCliCommand = {
      command: 'call',
      global: globalOptions(opts),
      tool,
      argsInput,
      allowWrite: opts.dangerouslyAllowWrite,
    };
    onCommand(cmd);
  });
}

function registerBatchCommand(program: Command, onCommand: (cmd: ParsedCliCommand) => void): void {
  addGlobalOptions(
    program
      .command('batch <file>')
      .description('Прогнать JSONL-файл вызовов в одной MCP-сессии')
      .option(
        '--dangerously-allow-write',
        'Разрешить инструменты класса write/local-side-effect',
        false
      )
      .option('--stop-on-error', 'Остановить батч на первой провалившейся строке', false)
      .option(
        '--delay-ms <n>',
        'Пауза между вызовами, мс',
        parseNonNegativeInt('--delay-ms'),
        DEFAULT_DELAY_MS
      )
      .option(
        '--call-timeout-ms <n>',
        'Таймаут одного вызова, мс',
        parseNonNegativeInt('--call-timeout-ms'),
        DEFAULT_CALL_TIMEOUT_MS
      )
  ).action((file: string, opts: BatchOpts) => {
    const cmd: BatchCliCommand = {
      command: 'batch',
      global: globalOptions(opts),
      batchFile: path.resolve(file),
      allowWrite: opts.dangerouslyAllowWrite,
      stopOnError: opts.stopOnError,
      delayMs: opts.delayMs,
      callTimeoutMs: opts.callTimeoutMs,
    };
    onCommand(cmd);
  });
}

function buildProgram(io: ParseArgsIo, onCommand: (cmd: ParsedCliCommand) => void): Command {
  const program = new Command();
  program
    .name('mcp-dev')
    .description(
      'Тонкий dev-интерфейс: вызов MCP-инструментов сервера через локально собранный бандл, ' +
        'без регистрации агента как MCP-клиента и без перезапуска сессии между вызовами'
    )
    .exitOverride()
    .configureOutput({
      writeOut: io.writeOut,
      writeErr: io.writeErr,
      outputError: (str: string, write: (text: string) => void): void => write(str),
    });

  registerListCommand(program, onCommand);
  registerCallCommand(program, onCommand);
  registerBatchCommand(program, onCommand);

  return program;
}

/**
 * Разобрать argv (в формате `process.argv`: `[node, script, ...args]`) в
 * {@link ParsedCliCommand}.
 *
 * Ошибки разбора (неизвестная команда, отсутствующая обязательная опция,
 * `--help`/`--version`) не бросают исключение — `commander.exitOverride()`
 * превращает их в {@link CommanderError}, которую эта функция ловит и
 * превращает в `{ outcome: 'exit', code }`.
 */
export function parseCliArgs(argv: readonly string[], io: ParseArgsIo): ParseArgsOutcome {
  let captured: ParsedCliCommand | undefined;
  const program = buildProgram(io, (cmd) => {
    captured = cmd;
  });

  try {
    program.parse([...argv]);
  } catch (error) {
    if (error instanceof CommanderError) {
      return { outcome: 'exit', code: error.exitCode };
    }
    throw error;
  }

  if (!captured) {
    io.writeErr('Не указана команда. Используйте: list | call | batch (см. --help)\n');
    return { outcome: 'exit', code: 1 };
  }
  return { outcome: 'command', value: captured };
}
