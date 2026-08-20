/**
 * Резолв запуска для CLI-адаптера: секреты → композиция env → маскер и
 * процессный guard → бандл. Порядок значим — см. комментарии по шагам.
 *
 * Секреты резолвятся первыми и maskер/guard устанавливаются сразу после них,
 * **до** резолва бандла: это защита в глубину — резолв бандла секретов не
 * содержит, но любой отказ дальше по цепочке (включая резолв бандла) после
 * этого момента гарантированно проходит через маскер, а не только явные
 * ошибки `tools/call`.
 */

import type { OpenSessionOptions } from '../session/index.js';
import {
  composeEnv,
  declareWriteRun,
  resolveLocalBundle,
  resolveSecretsEnv,
  type ResolveSecretsEnvOptions,
} from '../launch/index.js';
import {
  createMasker,
  installSecretGuard,
  type Masker,
  type UninstallSecretGuard,
} from '../secrets/index.js';
import type { DevSessionLaunch } from '../session/index.js';
import type { GlobalCliOptions } from './types.js';

/** Точки внедрения для тестов и для будущей настройки CLI (см. README пакета). */
export interface RunCliDeps {
  /** Фабрика коннектора для {@link resolveSecretsEnv} — по умолчанию реальный `ClaudeCodeConnector`. */
  readonly connectorFactory?: ResolveSecretsEnvOptions['connectorFactory'];
  /** Родительское окружение для {@link composeEnv} — по умолчанию `process.env`. */
  readonly parentEnv?: NodeJS.ProcessEnv;
  /** Фабрика транспорта {@link DevSession.open} — по умолчанию реальный `StdioClientTransport` (реальный спавн процесса). */
  readonly transportFactory?: OpenSessionOptions['transportFactory'];
}

export type ResolveLaunchResult =
  | {
      readonly outcome: 'ok';
      readonly launch: DevSessionLaunch;
      readonly masker: Masker;
      readonly uninstallGuard: UninstallSecretGuard;
    }
  | { readonly outcome: 'failed'; readonly exitCode: 2; readonly message: string };

function describeSecretsFailure(
  outcome: Exclude<Awaited<ReturnType<typeof resolveSecretsEnv>>, { outcome: 'ok' }>
): string {
  switch (outcome.outcome) {
    case 'notConnected':
      return 'Сервер не подключён ни в одном scope MCP-клиента. Подключите его (см. README сервера) и повторите.';
    case 'notStdio':
      return `Транспорт записи клиента — "${outcome.transport}", а не stdio. mcp-dev умеет запускать только stdio-серверы.`;
    case 'unparsable':
      return `Не удалось разобрать вывод MCP-клиента: ${outcome.reason}`;
    case 'commandFailed':
      // Текст ошибки команды намеренно не подставляется: этот отказ печатается
      // ДО построения маскера (секретов ещё нет), а stderr `claude mcp get`
      // может содержать фрагмент env записи. Диагностика — вручную.
      return 'Команда чтения записи MCP-клиента завершилась с ошибкой. Текст не печатается: он может содержать env записи. Проверьте вручную: claude mcp get <имя сервера>.';
    case 'emptyEnv':
      return 'Запись клиента найдена, но env пуст. Похоже на маскирование вывода клиентом — запуск без токена не выполняется.';
    case 'maskedEnv':
      return `Значения env записи клиента выглядят замаскированными (ключи: ${outcome.keys.join(', ')}). Запуск с маскированным токеном дал бы тихий отказ аутентификации — не выполняется.`;
  }
}

function describeBundleFailure(
  outcome: Exclude<Awaited<ReturnType<typeof resolveLocalBundle>>, { outcome: 'ok' }>
): string {
  switch (outcome.outcome) {
    case 'missing':
      return outcome.hint;
    case 'stale':
      return outcome.hint;
    case 'invalidPackageJson':
      return outcome.reason;
    case 'unverifiable':
      return outcome.hint;
  }
}

/** Резолвнуть секреты + бандл и собрать {@link DevSessionLaunch}, готовый для {@link DevSession.open}. */
export async function resolveLaunch(
  global: GlobalCliOptions,
  deps: RunCliDeps,
  /** Прогон разрешает запись (`--dangerously-allow-write`) — объявляется серверу. */
  allowWrite = false
): Promise<ResolveLaunchResult> {
  const secretsOutcome = await resolveSecretsEnv(
    global.serverName,
    deps.connectorFactory ? { connectorFactory: deps.connectorFactory } : {}
  );
  if (secretsOutcome.outcome !== 'ok') {
    return { outcome: 'failed', exitCode: 2, message: describeSecretsFailure(secretsOutcome) };
  }

  const parentEnv = deps.parentEnv ?? process.env;
  const env = declareWriteRun(composeEnv(secretsOutcome.env, parentEnv), allowWrite);
  // Оба источника отбираются одной шкалой чувствительности (`secrets/sensitivity.ts`):
  // по имени ключа и по форме значения. Не «все значения окружения» — иначе
  // `HOME`/`USER`/`PWD` затирают собственную диагностику (`missing`/`stale`
  // теряют путь); и не «вся запись клиента целиком» — иначе `YANDEX_ORG_ID`
  // затирает семизначные числа в тексте тикетов.
  const masker = createMasker({ clientEnv: secretsOutcome.env, parentEnv });
  const uninstallGuard = installSecretGuard({ masker });

  const bundleOutcome = await resolveLocalBundle(global.packageDir);
  if (bundleOutcome.outcome !== 'ok') {
    uninstallGuard();
    return {
      outcome: 'failed',
      exitCode: 2,
      message: masker(describeBundleFailure(bundleOutcome)),
    };
  }

  const launch: DevSessionLaunch = {
    command: process.execPath,
    args: [bundleOutcome.path],
    env,
    cwd: global.packageDir,
  };
  return { outcome: 'ok', launch, masker, uninstallGuard };
}
