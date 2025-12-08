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

// Найти все package.json в packages/
const packageDirs = [
  'packages/framework/infrastructure',
  'packages/framework/cli',
  'packages/framework/core',
  'packages/framework/search',
  'packages/servers/yandex-tracker',
  'packages/servers/yandex-wiki',
  'packages/servers/ticktick',
];

// Имена внутренних пакетов для обновления зависимостей
const internalPackages = [
  '@mcp-framework/infrastructure',
  '@mcp-framework/cli',
  '@mcp-framework/core',
  '@mcp-framework/search',
  '@mcp-server/yandex-tracker',
  '@mcp-server/yandex-wiki',
  '@mcp-server/ticktick',
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
  if (pkg.dependencies) {
    for (const dep of internalPackages) {
      if (pkg.dependencies[dep]) {
        pkg.dependencies[dep] = `^${version}`;
      }
    }
  }

  if (pkg.devDependencies) {
    for (const dep of internalPackages) {
      if (pkg.devDependencies[dep]) {
        pkg.devDependencies[dep] = `^${version}`;
      }
    }
  }

  if (pkg.peerDependencies) {
    for (const dep of internalPackages) {
      if (pkg.peerDependencies[dep]) {
        pkg.peerDependencies[dep] = `^${version}`;
      }
    }
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ ${pkg.name}: ${oldVersion} → ${version}`);
  updatedCount++;
}

console.log(`\nUpdated ${updatedCount} packages to version ${version}`);
