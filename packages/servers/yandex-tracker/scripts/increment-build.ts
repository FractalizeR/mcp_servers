#!/usr/bin/env tsx
/**
 * Скрипт для инкремента build number в manifest.json
 *
 * Автоматически вызывается при каждой сборке бандла для избежания кеширования.
 * Build number хранится в manifest.json в секции _meta.build.number
 *
 * Формат версии: {version}+{buildNumber}
 * Пример: 0.1.0+42
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface ManifestMeta {
  build?: {
    number?: number;
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
 * Инкрементирует build number в manifest.json
 */
async function incrementBuildNumber(): Promise<void> {
  // Определяем корень монорепо (поднимаемся вверх от packages/servers/yandex-tracker)
  const projectRoot = path.resolve(process.cwd());
  const isInWorkspace = projectRoot.includes('packages/servers/yandex-tracker');
  const monorepoRoot = isInWorkspace ? path.resolve(projectRoot, '../../..') : projectRoot;

  const manifestPath = path.join(monorepoRoot, 'manifest.json');

  console.log('🔢 Инкремент build number...');

  try {
    // Читаем manifest.json
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest: Manifest = JSON.parse(manifestContent);

    // Получаем текущий build number или начинаем с 1
    const currentBuildNumber = manifest._meta?.build?.number || 0;
    const newBuildNumber = currentBuildNumber + 1;

    // Обновляем _meta секцию
    if (!manifest._meta) {
      manifest._meta = {};
    }
    if (!manifest._meta.build) {
      manifest._meta.build = {};
    }

    manifest._meta.build.number = newBuildNumber;
    manifest._meta.build.generated_by = 'mcpb-build';
    manifest._meta.build.last_updated = new Date().toISOString().split('T')[0];

    // Сохраняем обновленный manifest.json с красивым форматированием
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    console.log(`✅ Build number инкрементирован: ${currentBuildNumber} → ${newBuildNumber}`);
    console.log(`📦 Полная версия: ${manifest.version}+${newBuildNumber}`);
  } catch (error) {
    console.error('❌ Ошибка при инкременте build number:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * CLI точка входа
 */
async function main() {
  await incrementBuildNumber();
}

// Запускаем если скрипт вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { incrementBuildNumber };
