#!/usr/bin/env tsx
/**
 * Универсальный скрипт для синхронизации версии и установки build hash в manifest.json
 *
 * Автоматически вызывается при каждой сборке бандла:
 * 1. Если есть manifest.template.json — копирует его в manifest.json
 * 2. Синхронизирует версию из package.json в manifest.json
 * 3. Устанавливает build hash для избежания кеширования
 *
 * Build hash хранится в manifest.json в секции _meta.build.hash
 * Формат версии: {version}+{gitHash}
 * Пример: 2.0.0+a1b2c3d
 *
 * Использование:
 *   tsx ../scripts/increment-build.ts          # из директории пакета
 *   tsx scripts/increment-build.ts <path>      # с указанием пути к пакету
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface ManifestMeta {
  build?: {
    number?: number;
    hash?: string;
    generated_by?: string;
    last_updated?: string;
  };
}

interface Manifest {
  version: string;
  _meta?: ManifestMeta;
  [key: string]: unknown;
}

/**
 * Получает короткий git hash текущего коммита
 */
function getGitHash(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    console.warn('⚠️  Не удалось получить git hash, используем fallback');
    return Date.now().toString(36);
  }
}

/**
 * Читает версию из package.json
 */
async function getPackageVersion(packageRoot: string): Promise<string> {
  const packageJsonPath = path.join(packageRoot, 'package.json');

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent) as { version: string };
    return packageJson.version;
  } catch {
    console.warn('⚠️  Не удалось прочитать версию из package.json');
    return '0.0.0';
  }
}

/**
 * Проверяет существование файла
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Устанавливает build hash в manifest.json
 */
async function setBuildHash(packageRoot: string): Promise<void> {
  const manifestPath = path.join(packageRoot, 'manifest.json');
  const manifestTemplatePath = path.join(packageRoot, 'manifest.template.json');

  console.log('🔢 Установка build hash и версии...');

  try {
    // Если есть template — копируем его
    if (await fileExists(manifestTemplatePath)) {
      console.log('📋 Обновление manifest.json из template...');
      await fs.copyFile(manifestTemplatePath, manifestPath);
    }

    // Проверяем существование manifest.json
    if (!(await fileExists(manifestPath))) {
      console.warn('⚠️  manifest.json не найден, пропускаем increment-build');
      return;
    }

    // Читаем manifest.json
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest: Manifest = JSON.parse(manifestContent);

    // Получаем версию из package.json
    const packageVersion = await getPackageVersion(packageRoot);

    // Получаем git hash текущего коммита
    const gitHash = getGitHash();

    // Формируем полную версию с git hash (SemVer build metadata)
    const fullVersion = `${packageVersion}+${gitHash}`;

    if (manifest.version !== fullVersion) {
      console.log(`📦 Обновление версии: ${manifest.version} → ${fullVersion}`);
      manifest.version = fullVersion;
    }

    // Обновляем _meta секцию
    if (!manifest._meta) {
      manifest._meta = {};
    }
    if (!manifest._meta.build) {
      manifest._meta.build = {};
    }

    // Инкрементируем build number если есть
    if (manifest._meta.build.number !== undefined) {
      manifest._meta.build.number += 1;
      console.log(`🔢 Build number: ${manifest._meta.build.number}`);
    }

    manifest._meta.build.hash = gitHash;
    manifest._meta.build.generated_by = 'mcpb-build';
    manifest._meta.build.last_updated = new Date().toISOString().split('T')[0];

    // Сохраняем обновленный manifest.json с красивым форматированием
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    console.log(`✅ Build hash установлен: ${gitHash}`);
    console.log(`📦 Полная версия: ${manifest.version}`);
  } catch (error) {
    console.error('❌ Ошибка при установке build hash:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * CLI точка входа
 */
async function main(): Promise<void> {
  // Поддержка аргумента командной строки для пути к пакету
  const packageRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd());

  await setBuildHash(packageRoot);
}

// Запускаем если скрипт вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

export { setBuildHash };
