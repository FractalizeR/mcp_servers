/**
 * Разобранные аргументы команд CLI `mcp-dev`.
 *
 * `serverName`/`packageDir` не имеют дефолтов здесь: дефолт — это дело
 * npm-скрипта конкретного сервера (`--server-name`/`--package-dir` захардкожены
 * в его `package.json`), а не константы framework-пакета — иначе получилась бы
 * обратная зависимость framework → сервер (см. README плана).
 */

/** Опции, общие для всех трёх команд. */
export interface GlobalCliOptions {
  readonly serverName: string;
  /** Абсолютный путь к каталогу пакета сервера (резолвится из CLI-аргумента относительно cwd). */
  readonly packageDir: string;
}

export interface ListCliCommand {
  readonly command: 'list';
  readonly global: GlobalCliOptions;
  readonly json: boolean;
  readonly writableOnly: boolean;
}

export interface CallCliCommand {
  readonly command: 'call';
  readonly global: GlobalCliOptions;
  readonly tool: string;
  /** Сырое значение второго позиционного аргумента: JSON-текст либо `@путь-к-файлу`. */
  readonly argsInput: string;
  readonly allowWrite: boolean;
}

export interface BatchCliCommand {
  readonly command: 'batch';
  readonly global: GlobalCliOptions;
  /** Абсолютный путь к JSONL-файлу батча. */
  readonly batchFile: string;
  readonly allowWrite: boolean;
  readonly stopOnError: boolean;
  readonly delayMs: number;
  readonly callTimeoutMs: number;
}

export type ParsedCliCommand = ListCliCommand | CallCliCommand | BatchCliCommand;

/** Итог разбора argv: успешно разобранная команда либо явный код завершения (ошибка разбора, `--help`, `--version`). */
export type ParseArgsOutcome =
  | { readonly outcome: 'command'; readonly value: ParsedCliCommand }
  | { readonly outcome: 'exit'; readonly code: number };
