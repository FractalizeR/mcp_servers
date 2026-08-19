/**
 * Резолв локального бандла сервера — единственный источник команды/пути запуска.
 *
 * Путь берётся из `package.json` пакета сервера (поле `bin`), а не из записи
 * MCP-клиента: см. README плана, раздел «Почему бандл берётся локальный».
 * Свежесть бандла (mtime) проверяется здесь же, в ядре, а не в npm-скрипте —
 * иначе прямой вызов `mcp-dev` без обёртки `npm run build && ...` обходит
 * проверку и молча запускает устаревший код.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Исходы {@link resolveLocalBundle}. */
export type BundleOutcome =
  | { readonly outcome: 'ok'; readonly path: string }
  | { readonly outcome: 'missing'; readonly hint: string }
  | {
      readonly outcome: 'stale';
      readonly bundleMtimeMs: number;
      readonly newestSourceMtimeMs: number;
      /** Файл, из-за которого бандл признан устаревшим (пусто, если определить не удалось). */
      readonly newestSourcePath: string;
      readonly hint: string;
    }
  | { readonly outcome: 'invalidPackageJson'; readonly reason: string }
  | {
      readonly outcome: 'unverifiable';
      /** Имена зависимостей `@fractalizer/*`, чей каталог найти не удалось. */
      readonly unresolved: readonly string[];
      readonly hint: string;
    };

interface ServerPackageJson {
  name?: string;
  bin?: string | Record<string, string>;
  dependencies?: Record<string, string>;
  workspaces?: string[];
}

/**
 * Имя scope рабочих пакетов монорепо. Зависимости с этим scope собираются
 * в бандл сервера (`packages/servers/tsup.config.base.ts` объявляет `noExternal`
 * для всех зависимостей),
 * поэтому их исходники входят в базу сверки свежести.
 */
const WORKSPACE_SCOPE = '@fractalizer/';

/**
 * Файлы пакета (помимо дерева `src`), изменение которых меняет содержимое
 * бандла: `package.json` (список зависимостей, версия, `bin`) и конфиг сборки.
 *
 * `../tsup.config.base.ts` — не опечатка: `<pkg>/tsup.config.ts` у всех серверов
 * монорепо тонкая обёртка над общим `packages/servers/tsup.config.base.ts`, где
 * и живут `noExternal`/`target`/`format`. Без него правка базового конфига
 * бандл устаревшим не делает. Для пакетов без общего конфига путь просто не
 * существует — `statSource` возвращает «нет исходника».
 */
const EXTRA_TRACKED_FILES = ['package.json', 'tsup.config.ts', '../tsup.config.base.ts'];

/** Кандидат «самый свежий исходник»: путь + mtime. */
interface NewestSource {
  readonly path: string;
  readonly mtimeMs: number;
}

const NO_SOURCE: NewestSource = { path: '', mtimeMs: 0 };

function newer(a: NewestSource, b: NewestSource): NewestSource {
  return b.mtimeMs > a.mtimeMs ? b : a;
}

/**
 * Выбрать путь к бандлу сервера из поля `bin`.
 *
 * Именно бандл, а не «первый ключ»: у всех серверов монорепо в `bin` есть
 * второй вход (`mcp-*-connect` → `dist/cli/bin/mcp-connect.js`), и порядок
 * ключей в JSON — не контракт: перестановка (в том числе автоформаттером)
 * отправила бы `mcp-dev` запускать connect-CLI вместо MCP-сервера.
 */
function serverBundlePath(bin: string | Record<string, string> | undefined): string | undefined {
  if (typeof bin === 'string') return bin;
  if (bin && typeof bin === 'object') {
    const bundles = Object.values(bin).filter((value) => /\.bundle\.[cm]?js$/.test(value));
    if (bundles.length === 1) return bundles[0];
    return undefined;
  }
  return undefined;
}

/** Рекурсивно найти самый свежий файл каталога (глубина не ограничена). */
async function findNewestInDir(dir: string): Promise<NewestSource> {
  let newest = NO_SOURCE;
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return newest;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = newer(newest, await findNewestInDir(fullPath));
    } else if (entry.isFile()) {
      newest = newer(newest, await statSource(fullPath));
    }
  }
  return newest;
}

async function statSource(filePath: string): Promise<NewestSource> {
  try {
    const stat = await fs.stat(filePath);
    return { path: filePath, mtimeMs: stat.mtimeMs };
  } catch {
    return NO_SOURCE;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(dir: string): Promise<ServerPackageJson | undefined> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(dir, 'package.json'), 'utf-8')
    ) as ServerPackageJson;
  } catch {
    return undefined;
  }
}

/**
 * Найти каталог рабочего пакета по имени зависимости через `node_modules`,
 * поднимаясь по дереву каталогов до `node_modules/<name>` (npm workspaces
 * кладёт туда симлинк на пакет монорепо) и разыменовывая симлинк: нужен путь
 * **в рабочем дереве**, иначе сверка свежести смотрела бы не на те исходники.
 */
async function resolveViaNodeModules(fromDir: string, name: string): Promise<string | undefined> {
  let current = path.resolve(fromDir);
  for (;;) {
    const candidate = path.join(current, 'node_modules', name);
    if (await fileExists(candidate)) {
      try {
        return await fs.realpath(candidate);
      } catch {
        return candidate;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/**
 * Индекс `имя пакета → каталог`, построенный по полю `workspaces` корневого
 * манифеста.
 *
 * Резолв только через `node_modules` опирается на **факт установки**: снесённый
 * или недоустановленный `node_modules` превращал сверку свежести в
 * «зависимость чиста» (см. второй раунд ревью, N3). Манифест корня описывает
 * состав монорепо независимо от установки, поэтому он — основной источник, а
 * `node_modules` остаётся запасным (пакет вне `workspaces`, установленный из
 * registry).
 */
type WorkspaceIndex = ReadonlyMap<string, string>;

/** Найти корень монорепо — ближайший вверх `package.json` с полем `workspaces`. */
async function findMonorepoRoot(fromDir: string): Promise<string | undefined> {
  let current = path.resolve(fromDir);
  for (;;) {
    const pkg = await readPackageJson(current);
    if (pkg?.workspaces !== undefined && pkg.workspaces.length > 0) return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/** Каталоги-кандидаты одного паттерна `workspaces` (поддержан вид `dir/*` и точный путь). */
async function expandWorkspacePattern(root: string, pattern: string): Promise<string[]> {
  if (!pattern.endsWith('/*')) return [path.resolve(root, pattern)];
  const parentDir = path.resolve(root, pattern.slice(0, -2));
  try {
    const entries = await fs.readdir(parentDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => path.join(parentDir, entry.name));
  } catch {
    return [];
  }
}

async function buildWorkspaceIndex(fromDir: string): Promise<WorkspaceIndex> {
  const index = new Map<string, string>();
  const root = await findMonorepoRoot(fromDir);
  if (root === undefined) return index;
  const rootPkg = await readPackageJson(root);
  for (const pattern of rootPkg?.workspaces ?? []) {
    for (const dir of await expandWorkspacePattern(root, pattern)) {
      const pkg = await readPackageJson(dir);
      if (pkg?.name !== undefined && !index.has(pkg.name)) index.set(pkg.name, dir);
    }
  }
  return index;
}

/** Каталоги пакетов, попадающих в бандл, и зависимости, чей каталог найти не удалось. */
interface BundledPackages {
  readonly dirs: readonly string[];
  readonly unresolved: readonly string[];
}

/**
 * Собрать список каталогов пакетов, чьи исходники попадают в бандл сервера:
 * сам сервер плюс транзитивно все зависимости со scope `@fractalizer/`.
 *
 * Без этого правка исходников `packages/framework/core` не делает бандл устаревшим,
 * хотя `@fractalizer/mcp-core` в бандл вбандлен целиком — сессия молча
 * открывалась бы на старом коде.
 *
 * Нерезолвнутые зависимости возвращаются отдельным списком, а не молча
 * пропускаются: «каталог не найден» и «зависимость проверена и чиста» — разные
 * факты, и склеивание их и есть тот молчаливый провал, ради которого базу
 * сверки расширяли.
 */
async function collectBundledPackageDirs(serverPackageDir: string): Promise<BundledPackages> {
  const workspaceIndex = await buildWorkspaceIndex(serverPackageDir);
  const seen = new Set<string>([path.resolve(serverPackageDir)]);
  const queue = [path.resolve(serverPackageDir)];
  const dirs: string[] = [];
  const unresolved = new Set<string>();

  while (queue.length > 0) {
    const dir = queue.shift() as string;
    dirs.push(dir);
    const pkg = await readPackageJson(dir);
    for (const depName of Object.keys(pkg?.dependencies ?? {})) {
      if (!depName.startsWith(WORKSPACE_SCOPE)) continue;
      const depDir = workspaceIndex.get(depName) ?? (await resolveViaNodeModules(dir, depName));
      if (depDir === undefined) {
        unresolved.add(depName);
        continue;
      }
      if (seen.has(depDir)) continue;
      seen.add(depDir);
      queue.push(depDir);
    }
  }
  return { dirs, unresolved: [...unresolved] };
}

/** Самый свежий исходник среди всех пакетов, попадающих в бандл (+ нерезолвнутые зависимости). */
async function findNewestBundledSource(
  serverPackageDir: string
): Promise<{ newest: NewestSource; unresolved: readonly string[] }> {
  const { dirs, unresolved } = await collectBundledPackageDirs(serverPackageDir);
  let newest = NO_SOURCE;
  for (const dir of dirs) {
    newest = newer(newest, await findNewestInDir(path.join(dir, 'src')));
    for (const fileName of EXTRA_TRACKED_FILES) {
      newest = newer(newest, await statSource(path.join(dir, fileName)));
    }
  }
  return { newest, unresolved };
}

/**
 * Резолвнуть путь к собранному бандлу сервера и проверить его свежесть
 * относительно исходников всех вбандленных пакетов.
 *
 * @param serverPackageDir - Абсолютный путь к каталогу пакета сервера
 *   (например, `packages/servers/yandex-tracker`) — **в текущем рабочем
 *   дереве** (не через `require.resolve` по установленному в node_modules
 *   пакету — это и есть гарантия «бандл из моего worktree, а не из main»).
 */
export async function resolveLocalBundle(serverPackageDir: string): Promise<BundleOutcome> {
  const packageJsonPath = path.join(serverPackageDir, 'package.json');
  let pkg: ServerPackageJson;
  try {
    const raw = await fs.readFile(packageJsonPath, 'utf-8');
    pkg = JSON.parse(raw) as ServerPackageJson;
  } catch (error) {
    return {
      outcome: 'invalidPackageJson',
      reason: `Не удалось прочитать/разобрать ${packageJsonPath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const binPath = serverBundlePath(pkg.bin);
  if (binPath === undefined) {
    return {
      outcome: 'invalidPackageJson',
      reason: `В ${packageJsonPath} не найден ровно один вход "bin", указывающий на бандл сервера (*.bundle.cjs)`,
    };
  }

  const bundlePath = path.resolve(serverPackageDir, binPath);
  // Одно обращение к ФС вместо пары `exists` + `stat`: раздельная проверка
  // оставляла окно, в котором бандл исчезал между ними (параллельный
  // `npm run clean`), и `stat` бросал исключение мимо исходов — код возврата 1
  // вместо документированного 2 («сессия не открылась»). Один `stat` в try
  // закрывает окно по построению, а не отдельным catch.
  let bundleStat: import('node:fs').Stats;
  try {
    bundleStat = await fs.stat(bundlePath);
  } catch {
    return {
      outcome: 'missing',
      hint: `Бандл не найден: ${bundlePath}. Соберите пакет: npm run build (в ${serverPackageDir})`,
    };
  }

  const { newest: newestSource, unresolved } = await findNewestBundledSource(serverPackageDir);

  if (unresolved.length > 0) {
    return {
      outcome: 'unverifiable',
      unresolved,
      hint: `Свежесть бандла не проверяема: не найдены каталоги зависимостей ${unresolved.join(', ')}. Их исходники входят в бандл, и без них "бандл свеж" — необоснованное утверждение. Выполните npm install в корне монорепо и повторите.`,
    };
  }

  if (newestSource.mtimeMs > bundleStat.mtimeMs) {
    return {
      outcome: 'stale',
      bundleMtimeMs: bundleStat.mtimeMs,
      newestSourceMtimeMs: newestSource.mtimeMs,
      newestSourcePath: newestSource.path,
      hint: `Бандл старше исходников (${bundlePath}); свежее всего: ${newestSource.path}. Пересоберите: npm run build (в ${serverPackageDir})`,
    };
  }

  return { outcome: 'ok', path: bundlePath };
}
