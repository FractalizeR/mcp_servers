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
  '@fractalizer/mcp-infrastructure',
  '@fractalizer/mcp-cli',
  '@fractalizer/mcp-core',
  '@fractalizer/mcp-search',
  '@fractalizer/mcp-server-yandex-tracker',
  '@fractalizer/mcp-server-yandex-wiki',
  '@fractalizer/mcp-server-ticktick',
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

  // Также обновить manifest.json если существует (для MCPB)
  const manifestPath = join(rootDir, dir, 'manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const shortHash = process.env.GITHUB_SHA?.slice(0, 7) || 'local';
    manifest.version = `${version}+${shortHash}`;
    if (manifest._meta?.build) {
      manifest._meta.build.hash = shortHash;
      manifest._meta.build.last_updated = new Date().toISOString().split('T')[0];
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`  📦 manifest.json: ${manifest.version}`);
  }
}

console.log(`\nUpdated ${updatedCount} packages to version ${version}`);
