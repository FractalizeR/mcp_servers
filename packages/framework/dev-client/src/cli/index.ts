/**
 * CLI-адаптер `mcp-dev`: тонкая доставка поверх ядра пакета. Команды —
 * `list`, `call`, `batch` (см. README плана, раздел «Команды»).
 * @packageDocumentation
 */

export { runCli, type CliIo, type RunCliDeps } from './run-cli.js';
export { parseCliArgs, type ParseArgsIo } from './parse-args.js';
export type {
  BatchCliCommand,
  CallCliCommand,
  GlobalCliOptions,
  ListCliCommand,
  ParseArgsOutcome,
  ParsedCliCommand,
} from './types.js';
