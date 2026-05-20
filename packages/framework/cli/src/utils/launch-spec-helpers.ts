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
 * Определить путь к исполняемому файлу, который реально нужно проверить на диске,
 * из спецификации запуска.
 *
 * Логика выровнена с {@link BaseConnector.validateLaunchSpec}:
 *  - Если `spec.command` — абсолютный путь → возвращаем его.
 *  - Если `spec.command === 'node'` → ищем первый абсолютный путь в `args` (могут
 *    быть Node-флаги типа `--no-warnings`, `--enable-source-maps` перед скриптом).
 *  - Во всех остальных случаях (`npx`, `pipx`, относительная команда из PATH,
 *    `node` без абсолютного пути в args) → возвращаем `null` (проверка на диске
 *    не применима).
 *
 * @param spec - Спецификация запуска
 * @returns Абсолютный путь к проверяемому файлу или `null`
 */
export function resolveExecutablePath(spec: ServerLaunchSpec): string | null {
  if (path.isAbsolute(spec.command)) {
    return spec.command;
  }
  if (spec.command === 'node') {
    const scriptPath = spec.args.find((arg) => path.isAbsolute(arg));
    return scriptPath ?? null;
  }
  return null;
}
