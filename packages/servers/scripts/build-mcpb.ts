#!/usr/bin/env tsx
/**
 * Универсальный скрипт для сборки MCPB архива (MCP Bundle)
 *
 * Создает .mcpb файл - zip-архив, содержащий:
 * - manifest.json (валидированный согласно схеме MCP)
 * - dist/ (скомпилированный код сервера)
 * - package.json (метаданные npm пакета)
 * - README.md (документация)
 *
 * Использует официальный @anthropic-ai/mcpb пакет для сборки.
 * Файлы для исключения настраиваются в .mcpbignore (корень monorepo).
 *
 * Использование:
 *   tsx ../scripts/build-mcpb.ts          # из директории пакета
 *   tsx scripts/build-mcpb.ts <path>      # с указанием пути к пакету
 */

import { packExtension } from '@anthropic-ai/mcpb/cli';
import { validateManifest } from '@anthropic-ai/mcpb/node';
import { accessSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface BuildOptions {
  /** Путь к корню пакета (где находится manifest.json) */
  packageRoot: string;
  /** Путь для выходного .mcpb файла */
  outputPath?: string;
  /** Тихий режим (без вывода в консоль) */
  silent?: boolean;
}

/**
 * Определяет корень monorepo относительно пакета
 */
function findMonorepoRoot(packageRoot: string): string {
  // Ищем корень по наличию turbo.json или package.json с workspaces
  let current = packageRoot;
  while (current !== '/') {
    const turboPath = path.join(current, 'turbo.json');
    try {
      // Синхронная проверка для простоты
      accessSync(turboPath);
      return current;
    } catch {
      current = path.dirname(current);
    }
  }
  // Fallback: предполагаем стандартную структуру packages/servers/xxx
  return path.resolve(packageRoot, '../../..');
}

/**
 * Основная функция сборки MCPB архива
 */
async function buildMcpb(options: BuildOptions): Promise<void> {
  const { packageRoot, outputPath, silent = false } = options;

  const log = (message: string) => {
    if (!silent) {
      console.log(message);
    }
  };

  log('🚀 Начало сборки MCPB архива...');

  const monorepoRoot = findMonorepoRoot(packageRoot);

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

  // Упаковываем в .mcpb архив напрямую из packageRoot
  // packExtension использует .mcpbignore для исключения лишних файлов (src/, tests/, node_modules/ и т.д.)
  log('🔨 Создание .mcpb архива...');

  const packResult = await packExtension({
    extensionPath: packageRoot,
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
}

/**
 * CLI точка входа
 */
async function main() {
  // Поддержка аргумента командной строки для пути к пакету
  const packageRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd());

  try {
    await buildMcpb({
      packageRoot,
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
