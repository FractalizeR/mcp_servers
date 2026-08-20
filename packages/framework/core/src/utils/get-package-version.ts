/**
 * Чтение версии сервера из его собственного `package.json` (M2 отчёта
 * REVIEW_MCP_SDK_FINDINGS.md: до этого хелпера идентичная функция была
 * продублирована 1-в-1 в каждом `server.ts` — tracker, wiki).
 *
 * Резолюция ОТНОСИТЕЛЬНО ВЫЗЫВАЮЩЕГО модуля, не этого файла: каждый сервер
 * бандлится tsup в единый `dist/{serverName}.bundle.cjs` (см.
 * `packages/servers/tsup.config.base.ts`, `shims: true` для `import.meta.url`
 * в CJS), и `package.json`, версию которого нужно прочитать — это
 * package.json САМОГО СЕРВЕРА (на уровень выше его `dist/`), а не
 * package.json `@fractalizer/mcp-core`. Поэтому хелпер принимает
 * `import.meta.url` точки входа сервера как параметр, а не читает
 * собственный `import.meta.url`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Получить версию из `package.json`, лежащего на уровень выше директории
 * вызывающего модуля (т.е. `<packageRoot>/package.json` для файла из
 * `<packageRoot>/dist/...` или `<packageRoot>/src/...`).
 *
 * @param callerImportMetaUrl - `import.meta.url` вызывающего модуля (обычно
 *   входной точки сервера, `server.ts`/`index.ts`). Определяет, ЧЕЙ
 *   `package.json` будет прочитан.
 * @returns версия из `package.json` либо `'0.0.0'` при любой ошибке чтения
 *   (файл отсутствует, невалидный JSON и т.п.) — fallback, а не исключение,
 *   т.к. версия используется только для отображения в `Implementation`.
 */
export function getPackageVersion(callerImportMetaUrl: string): string {
  try {
    const callerFilename = fileURLToPath(callerImportMetaUrl);
    const callerDirname = dirname(callerFilename);
    const packageJsonPath = join(callerDirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version: string };
    return packageJson.version;
  } catch {
    return '0.0.0'; // fallback если не удалось прочитать
  }
}
