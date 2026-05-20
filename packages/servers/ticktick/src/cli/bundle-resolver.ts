/**
 * Резолвер пути к собранному бандлу MCP сервера TickTick.
 *
 * Выделено в отдельный модуль для тестируемости: в unit-тестах подставляется
 * фейковая реализация, без обращения к Node module resolver и файловой системе.
 */

import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Тип резолвера: возвращает абсолютный путь к бандлу или кидает ошибку.
 */
export type BundleResolver = () => string;

const PACKAGE_BUNDLE_SPECIFIER = '@fractalizer/mcp-server-ticktick/dist/ticktick.bundle.cjs';

/**
 * Дефолтный резолвер бандла TickTick.
 *
 * Алгоритм:
 *  1. Primary: `createRequire(import.meta.url).resolve(<package-bundle-specifier>)`.
 *     Семантически правильный путь — Node идёт по `exports` map пакета.
 *  2. Fallback: путь относительно `import.meta.url`. В выпускной сборке tsup
 *     бандлит весь CLI в `dist/cli/bin/mcp-connect.js`, поэтому
 *     `'../../ticktick.bundle.cjs'` приводит к корню `dist/`. ESM-корректная
 *     альтернатива `__dirname` (через `fileURLToPath(new URL(..., import.meta.url))`).
 *  3. Если оба пути не указывают на существующий файл — кинуть подробную ошибку.
 */
export const defaultBundleResolver: BundleResolver = (): string => {
  let primaryError: string | undefined;
  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve(PACKAGE_BUNDLE_SPECIFIER);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
    primaryError = `файл не найден по пути ${resolved}`;
  } catch (err) {
    primaryError = err instanceof Error ? err.message : String(err);
  }

  const fallbackPath = fileURLToPath(new URL('../../ticktick.bundle.cjs', import.meta.url));
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  throw new Error(
    'Не удалось найти бандл MCP сервера TickTick.\n' +
      `  Primary (npm resolve ${PACKAGE_BUNDLE_SPECIFIER}): ${primaryError ?? 'неизвестная ошибка'}\n` +
      `  Fallback (relative): ${fallbackPath} — файл не существует.\n` +
      'Убедитесь, что пакет собран (`npm run build`) или переустановлен глобально.'
  );
};
