/**
 * Утилиты для работы со спецификациями запуска MCP серверов.
 *
 * Извлечены из {@link BaseConnector.validateLaunchSpec} и
 * {@link ConfigurableConnector.commandExistsOnDisk} для переиспользования
 * в команде `doctor` без дублирования логики.
 *
 * @packageDocumentation
 */

import * as path from 'node:path';
import type { ServerLaunchSpec } from '../types/launch.types.js';

/**
 * Список Node-флагов, требующих value (один следующий arg — это значение).
 *
 * Используется парсером argv для команды `node`: после такого флага следующий
 * positional аргумент НЕ является скриптом. Источник — `node --help` / docs.
 *
 * Поддерживаются обе формы: `--flag value` и `--flag=value`. Для `--flag=value`
 * значение зашито в сам arg и следующий arg не пропускается.
 */
const NODE_FLAGS_WITH_VALUE: ReadonlySet<string> = new Set([
  '--import',
  '--require',
  '-r',
  '--experimental-loader',
  '--loader',
  '--experimental-policy',
  '--inspect-publish-uid',
  '--cpu-prof-dir',
  '--cpu-prof-name',
  '--cpu-prof-interval',
  '--heap-prof-dir',
  '--heap-prof-name',
  '--heap-prof-interval',
  '--diagnostic-dir',
  '--redirect-warnings',
  '--report-dir',
  '--report-directory',
  '--report-filename',
  '--report-signal',
  '--tls-cipher-list',
  '--tls-keylog',
  '--use-openssl-ca',
  '--use-bundled-ca',
  '--max-http-header-size',
  '--max-old-space-size',
  '--max-semi-space-size',
  '--openssl-config',
  '--title',
  '--unhandled-rejections',
  '--v8-pool-size',
]);

/**
 * Проверить, является ли аргумент Node-флагом «без значения».
 *
 * Эвристика: всё, что начинается с `-` или `--` и не из {@link NODE_FLAGS_WITH_VALUE},
 * считается флагом-without-value. Это покрывает `--no-warnings`,
 * `--enable-source-maps`, `--inspect`, `--inspect-brk`, `--use-strict`,
 * `--zero-fill-buffers` и т.п.
 *
 * Edge case: формы `--flag=value` (с `=`) всегда возвращают `true` — значение
 * зашито в сам arg, следующий arg не пропускается.
 */
function isNodeFlag(arg: string): boolean {
  return arg.startsWith('-');
}

/**
 * Определить путь к исполняемому файлу, который реально нужно проверить на диске,
 * из спецификации запуска.
 *
 * Логика выровнена с {@link BaseConnector.validateLaunchSpec}:
 *  - Если `spec.command` — абсолютный путь → возвращаем его.
 *  - Если `spec.command === 'node'` → парсим `args` как Node argv:
 *      пропускаем флаги-without-value (любые `-*`/`--*` без `=` не из whitelist)
 *      и пары `flag value` для флагов из {@link NODE_FLAGS_WITH_VALUE}.
 *      Первый positional аргумент после options — это путь к скрипту.
 *      Возвращаем его, только если он абсолютный (иначе `null`).
 *  - Во всех остальных случаях (`npx`, `pipx`, относительная команда из PATH) →
 *    возвращаем `null` (проверка на диске не применима).
 *
 * @param spec - Спецификация запуска
 * @returns Абсолютный путь к проверяемому файлу или `null`
 *
 * @example
 * ```typescript
 * // node /abs/server.cjs → '/abs/server.cjs'
 * // node --no-warnings /abs/server.cjs → '/abs/server.cjs'
 * // node --import /abs/preload.mjs /abs/server.cjs → '/abs/server.cjs'
 * // node --import=/abs/preload.mjs /abs/server.cjs → '/abs/server.cjs'
 * // node --version → null (нет positional абсолютного пути)
 * ```
 */
export function resolveExecutablePath(spec: ServerLaunchSpec): string | null {
  if (path.isAbsolute(spec.command)) {
    return spec.command;
  }
  if (spec.command === 'node') {
    return resolveNodeScriptPath(spec.args);
  }
  return null;
}

/**
 * Найти путь к скрипту в Node argv.
 *
 * Алгоритм:
 *  1. Идём по args слева направо.
 *  2. Если arg вида `--flag=value` или `-f` (но не из {@link NODE_FLAGS_WITH_VALUE}) —
 *     это флаг-without-value, переходим к следующему.
 *  3. Если arg ровно из {@link NODE_FLAGS_WITH_VALUE} — пропускаем следующий arg как value.
 *  4. Первый non-flag positional argument — это путь к скрипту.
 *  5. Возвращаем его, если абсолютный; иначе `null`.
 */
function resolveNodeScriptPath(args: readonly string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (!isNodeFlag(arg)) {
      // Первый positional — это скрипт
      return path.isAbsolute(arg) ? arg : null;
    }
    // Это флаг. Если форма '--flag=value' — value зашит, следующий arg не value.
    if (arg.includes('=')) {
      continue;
    }
    // Если флаг из known-with-value — пропускаем следующий аргумент как value.
    if (NODE_FLAGS_WITH_VALUE.has(arg)) {
      i++; // skip value
    }
    // Иначе — флаг-without-value (например, --no-warnings), просто продолжаем.
  }
  return null;
}
