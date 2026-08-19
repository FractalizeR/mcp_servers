/**
 * Замена мёртвому depcruise-правилу `no-circular-dev-client` (см. комментарий
 * в `.dependency-cruiser.cjs`): dev-client — dev-инструмент, framework-пакеты
 * не имеют права от него зависеть, но path-based правило это не ловит
 * (межпакетное ребро уходит в `dist/`, который отсечён из графа).
 *
 * Здесь защита машинная и живая: сканируем исходники framework-пакетов на
 * импорт `@fractalizer/mcp-dev-client`. Тест краснеет ровно на том сценарии,
 * который правило обещало ловить и не ловило.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const FRAMEWORK_ROOT = path.resolve(__dirname, '../../..');
const PACKAGES_ROOT = path.resolve(FRAMEWORK_ROOT, '..');
const DEV_CLIENT_PACKAGE = '@fractalizer/mcp-dev-client';
const GUARDED_PACKAGES = ['infrastructure', 'core', 'cli'];
// Именно инструкция импорта, а не любое упоминание строки: JSDoc в
// `cli/src/types/launch.types.ts` ссылается на dev-client как на потребителя
// контракта — это документация, а не зависимость.
const FORBIDDEN_IMPORT = /(?:from|import|require\()\s*\(?\s*['"]@fractalizer\/mcp-dev-client/;

function collectTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(full);
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

describe('framework-пакеты не зависят от dev-client', () => {
  it.each(GUARDED_PACKAGES)('%s не импортирует @fractalizer/mcp-dev-client', (pkg) => {
    const srcDir = path.join(FRAMEWORK_ROOT, pkg, 'src');
    const files = collectTsFiles(srcDir);
    // Страховка от «тест позеленел, потому что ничего не просканировал».
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((file) => FORBIDDEN_IMPORT.test(fs.readFileSync(file, 'utf-8')));
    expect(offenders).toEqual([]);
  });
});

interface PackageManifest {
  readonly name?: string;
  readonly dependencies?: Record<string, string>;
}

/** Все манифесты пакетов монорепо (кроме самого dev-client). */
function collectManifests(): { file: string; manifest: PackageManifest }[] {
  if (!fs.existsSync(PACKAGES_ROOT)) return [];
  return fs
    .readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((group) => group.isDirectory())
    .flatMap((group) => {
      const groupDir = path.join(PACKAGES_ROOT, group.name);
      return fs
        .readdirSync(groupDir, { withFileTypes: true })
        .filter((pkg) => pkg.isDirectory())
        .map((pkg) => path.join(groupDir, pkg.name, 'package.json'))
        .filter((file) => fs.existsSync(file))
        .map((file) => ({
          file,
          manifest: JSON.parse(fs.readFileSync(file, 'utf-8')) as PackageManifest,
        }));
    })
    .filter(({ manifest }) => manifest.name !== DEV_CLIENT_PACKAGE);
}

describe('dev-client не уезжает в рантайм-зависимости публикуемых пакетов', () => {
  // Проверка импортов выше ловит только использование в `src`. Объявление
  // dev-инструмента в `dependencies` (а не `devDependencies`) без единого
  // импорта она пропускает — а это тянет dev-client в рантайм публикуемого
  // пакета и к потребителю.
  it('ни один пакет не объявляет @fractalizer/mcp-dev-client в dependencies', () => {
    const manifests = collectManifests();
    // Страховка от «тест позеленел, потому что ничего не просканировал».
    expect(manifests.length).toBeGreaterThan(0);

    const offenders = manifests
      .filter(({ manifest }) => manifest.dependencies?.[DEV_CLIENT_PACKAGE] !== undefined)
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
