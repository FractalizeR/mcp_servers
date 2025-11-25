#!/usr/bin/env tsx
/**
 * Скрипт для сборки MCPB архива (MCP Bundle)
 *
 * Создает .mcpb файл - zip-архив, содержащий:
 * - manifest.json (валидированный согласно схеме MCP)
 * - dist/ (скомпилированный код сервера)
 * - package.json (метаданные npm пакета)
 * - README.md (документация)
 *
 * Использует официальный @anthropic-ai/mcpb пакет для сборки.
 */

import { packExtension } from '@anthropic-ai/mcpb/cli';
import { validateManifest } from '@anthropic-ai/mcpb/node';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface BuildOptions {
  /** Путь к корню проекта (где находится manifest.json) */
  projectRoot: string;
  /** Путь для выходного .mcpb файла */
  outputPath?: string;
  /** Тихий режим (без вывода в консоль) */
  silent?: boolean;
}

/**
 * Основная функция сборки MCPB архива
 */
async function buildMcpb(options: BuildOptions): Promise<void> {
  const { projectRoot, outputPath, silent = false } = options;

  const log = (message: string) => {
    if (!silent) {
      console.log(message);
    }
  };

  log('🚀 Начало сборки MCPB архива...');

  // Определяем корень пакета и монорепо
  // Если запускается из workspace, cwd будет packages/servers/yandex-wiki
  // Если запускается из корня, cwd будет корень
  const isInWorkspace = projectRoot.includes('packages/servers/yandex-wiki');
  const packageRoot = isInWorkspace
    ? projectRoot
    : path.join(projectRoot, 'packages/servers/yandex-wiki');
  const monorepoRoot = isInWorkspace ? path.resolve(projectRoot, '../../..') : projectRoot;

  // Проверяем существование необходимых файлов
  const manifestPath = path.join(packageRoot, 'manifest.json');
  const distPath = path.join(packageRoot, 'dist');

  try {
    await fs.access(manifestPath);
    log('✅ manifest.json найден');
  } catch {
    throw new Error(`manifest.json не найден по пути: ${manifestPath}`);
  }

  try {
    await fs.access(distPath);
    log('✅ dist/ директория найдена');
  } catch {
    throw new Error(
      `dist/ директория не найдена по пути: ${distPath}. Запустите 'npm run build' сначала.`
    );
  }

  // Валидируем manifest.json
  log('🔍 Валидация manifest.json...');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent);

  const isValid = validateManifest(manifestPath);

  if (!isValid) {
    throw new Error('manifest.json не соответствует схеме MCPB. Проверьте вывод выше.');
  }

  log('✅ manifest.json валиден');

  // Определяем путь для выходного файла
  const defaultOutputPath = path.join(monorepoRoot, `${manifest.name}-${manifest.version}.mcpb`);
  const finalOutputPath = outputPath || defaultOutputPath;

  // Создаем временную директорию для сборки
  const tempBuildDir = path.join(monorepoRoot, '.mcpb-build');
  await fs.mkdir(tempBuildDir, { recursive: true });

  try {
    log('📦 Подготовка файлов для архива...');

    // Копируем manifest.json
    await fs.copyFile(manifestPath, path.join(tempBuildDir, 'manifest.json'));

    // Копируем dist/
    await copyDirectory(distPath, path.join(tempBuildDir, 'dist'));

    // Копируем package.json (опционально)
    const packageJsonPath = path.join(packageRoot, 'package.json');
    try {
      await fs.copyFile(packageJsonPath, path.join(tempBuildDir, 'package.json'));
      log('✅ package.json скопирован');
    } catch {
      log('⚠️  package.json не найден (необязательно)');
    }

    // Копируем README.md (опционально)
    const readmePath = path.join(packageRoot, 'README.md');
    try {
      await fs.copyFile(readmePath, path.join(tempBuildDir, 'README.md'));
      log('✅ README.md скопирован');
    } catch {
      log('⚠️  README.md не найден (необязательно)');
    }

    // Упаковываем в .mcpb архив
    log('🔨 Создание .mcpb архива...');

    const packResult = await packExtension({
      extensionPath: tempBuildDir,
      outputPath: finalOutputPath,
      silent,
    });

    if (!packResult) {
      throw new Error('Ошибка при создании MCPB архива');
    }

    log(`✅ MCPB архив успешно создан: ${finalOutputPath}`);

    // Показываем информацию о файле
    const stats = await fs.stat(finalOutputPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    log(`📊 Размер архива: ${sizeInMB} MB`);
  } finally {
    // Удаляем временную директорию
    await fs.rm(tempBuildDir, { recursive: true, force: true });
  }
}

/**
 * Рекурсивно копирует директорию
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * CLI точка входа
 */
async function main() {
  const projectRoot = path.resolve(process.cwd());

  try {
    await buildMcpb({
      projectRoot,
      silent: false,
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при сборке MCPB архива:');
    console.error(error);
    process.exit(1);
  }
}

// Запускаем если скрипт вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildMcpb };
