#!/usr/bin/env node

/**
 * Скрипт для синхронного обновления версий во всех пакетах monorepo.
 * Вызывается semantic-release через @semantic-release/exec
 *
 * Usage: node scripts/update-versions.mjs <version>
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/update-versions.mjs <version>');
  process.exit(1);
}

console.log(`Updating all packages to version ${version}...`);

// Обновить корневой package.json
const rootPkgPath = join(rootDir, 'package.json');
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
const rootOldVersion = rootPkg.version;
rootPkg.version = version;
writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
console.log(`✅ ${rootPkg.name} (root): ${rootOldVersion} → ${version}`);

// Найти все package.json в packages/
const packageDirs = [
  'packages/framework/infrastructure',
  'packages/framework/cli',
  'packages/framework/core',
  'packages/servers/yandex-tracker',
  'packages/servers/yandex-wiki',
  'packages/wrappers/mcp-server-yandex-tracker',
  'packages/wrappers/mcp-server-yandex-wiki',
];

// Имена внутренних пакетов для обновления зависимостей
const internalPackages = [
  '@fractalizer/mcp-infrastructure',
  '@fractalizer/mcp-cli',
  '@fractalizer/mcp-core',
  '@fractalizer/mcp-server-yandex-tracker',
  '@fractalizer/mcp-server-yandex-wiki',
];

let updatedCount = 0;

for (const dir of packageDirs) {
  const pkgPath = join(rootDir, dir, 'package.json');

  if (!existsSync(pkgPath)) {
    console.warn(`Warning: ${pkgPath} not found, skipping`);
    continue;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version;

  // Обновить версию пакета
  pkg.version = version;

  // Обновить версии внутренних зависимостей
  // Зависимости с workspace: протоколом не трогаем — npm заменяет их
  // на реальные версии при публикации автоматически
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (pkg[section]) {
      for (const dep of internalPackages) {
        if (pkg[section][dep] && !pkg[section][dep].startsWith('workspace:')) {
          pkg[section][dep] = `^${version}`;
        }
      }
    }
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ ${pkg.name}: ${oldVersion} → ${version}`);
  updatedCount++;

  // manifest.json здесь НЕ трогается: он производный (шаблон + версия из
  // package.json + git hash) и генерируется в build:mcpb скриптом
  // packages/servers/scripts/increment-build.ts. В git не хранится.
}

console.log(`\nUpdated ${updatedCount} packages to version ${version}`);

// Обновить package-lock.json чтобы он соответствовал новым версиям
// Без этого npm ci будет резолвить старые версии из registry
import { execSync } from 'child_process';
console.log('\n📦 Updating package-lock.json...');
try {
  execSync('npm install --package-lock-only --ignore-scripts', {
    cwd: rootDir,
    stdio: 'inherit',
  });
  console.log('✅ package-lock.json updated');
} catch (error) {
  console.error('❌ Failed to update package-lock.json:', error.message);
  process.exit(1);
}
