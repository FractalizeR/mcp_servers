#!/usr/bin/env tsx
/**
 * Счетчик строк кода с разбиением по пакетам
 *
 * Показывает итоговое количество строк кода по языкам с разбиением:
 * - Пакет
 *   - Исходный код (src/)
 *   - Тесты (tests/)
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';

interface ClocResult {
  language: string;
  files: number;
  blank: number;
  comment: number;
  code: number;
}

interface PackageStats {
  packageName: string;
  packagePath: string;
  src: ClocResult[];
  tests: ClocResult[];
}

/**
 * Парсит вывод cloc в формате CSV
 */
function parseClocOutput(output: string): ClocResult[] {
  const lines = output.trim().split('\n');
  const results: ClocResult[] = [];

  // Пропускаем заголовок CSV
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 5) continue;

    // CSV формат cloc: files, language, blank, comment, code
    const [files, language, blank, comment, code] = parts;

    // Пропускаем итоговую строку SUM
    if (language.trim() === 'SUM') continue;

    results.push({
      language: language.trim(),
      files: parseInt(files, 10),
      blank: parseInt(blank, 10),
      comment: parseInt(comment, 10),
      code: parseInt(code, 10),
    });
  }

  return results;
}

/**
 * Запускает cloc для директории
 */
function runCloc(path: string): ClocResult[] {
  if (!existsSync(path)) {
    return [];
  }

  try {
    const output = execSync(
      `npx cloc "${path}" --exclude-dir=node_modules,dist,.git --csv --quiet`,
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    return parseClocOutput(output);
  } catch (error) {
    // cloc возвращает ненулевой код, если нет файлов для подсчета
    return [];
  }
}

/**
 * Получает имя пакета из package.json
 */
function getPackageName(packagePath: string): string {
  try {
    const packageJsonPath = join(packagePath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      // Возвращаем имя директории без полного пути
      return packagePath.split('/').pop() || packagePath;
    }

    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.name || packagePath.split('/').pop() || packagePath;
  } catch {
    return packagePath.split('/').pop() || packagePath;
  }
}

/**
 * Собирает статистику по всем пакетам
 */
function collectStats(projectRoot: string): PackageStats[] {
  const packages: PackageStats[] = [];

  // Находим все пакеты
  const frameworkPackages = globSync('packages/framework/*', { cwd: projectRoot });
  const serverPackages = globSync('packages/servers/*', { cwd: projectRoot });
  const allPackages = [...frameworkPackages, ...serverPackages];

  for (const packagePath of allPackages) {
    const fullPath = join(projectRoot, packagePath);

    // Пропускаем файлы (например, .gitkeep, README.md)
    const packageJsonPath = join(fullPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const packageName = getPackageName(fullPath);
    const srcPath = join(fullPath, 'src');
    const testsPath = join(fullPath, 'tests');

    packages.push({
      packageName,
      packagePath,
      src: runCloc(srcPath),
      tests: runCloc(testsPath),
    });
  }

  return packages;
}

/**
 * Форматирует статистику для вывода
 */
function formatStats(results: ClocResult[], indent: string = '  '): string {
  if (results.length === 0) {
    return `${indent}(нет файлов)`;
  }

  const lines: string[] = [];
  for (const result of results) {
    lines.push(`${indent}${result.language}: ${result.code} строк`);
  }

  return lines.join('\n');
}

/**
 * Вычисляет общую статистику
 */
function calculateTotal(stats: PackageStats[]): { src: ClocResult[]; tests: ClocResult[] } {
  const srcMap = new Map<string, ClocResult>();
  const testsMap = new Map<string, ClocResult>();

  for (const pkg of stats) {
    // Суммируем исходный код
    for (const result of pkg.src) {
      const existing = srcMap.get(result.language);
      if (existing) {
        existing.files += result.files;
        existing.blank += result.blank;
        existing.comment += result.comment;
        existing.code += result.code;
      } else {
        srcMap.set(result.language, { ...result });
      }
    }

    // Суммируем тесты
    for (const result of pkg.tests) {
      const existing = testsMap.get(result.language);
      if (existing) {
        existing.files += result.files;
        existing.blank += result.blank;
        existing.comment += result.comment;
        existing.code += result.code;
      } else {
        testsMap.set(result.language, { ...result });
      }
    }
  }

  return {
    src: Array.from(srcMap.values()).sort((a, b) => b.code - a.code),
    tests: Array.from(testsMap.values()).sort((a, b) => b.code - a.code),
  };
}

/**
 * Выводит результаты
 */
function printResults(stats: PackageStats[]): void {
  console.log('\n📊 Статистика по строкам кода\n');

  // Сортируем пакеты по имени для консистентного вывода
  const sortedStats = [...stats].sort((a, b) => a.packageName.localeCompare(b.packageName));

  for (const pkg of sortedStats) {
    console.log(`📦 ${pkg.packageName}`);

    console.log('\n  📄 Исходный код:');
    console.log(formatStats(pkg.src, '    '));

    console.log('\n  🧪 Тесты:');
    console.log(formatStats(pkg.tests, '    '));

    console.log('');
  }

  // Общая статистика
  const total = calculateTotal(stats);

  console.log('═══════════════════════════════════════\n');
  console.log('📊 ИТОГО по всем пакетам:\n');

  console.log('  📄 Исходный код:');
  console.log(formatStats(total.src, '    '));

  console.log('\n  🧪 Тесты:');
  console.log(formatStats(total.tests, '    '));

  console.log('');
}

function main(): void {
  const projectRoot = process.cwd();

  console.log('🔍 Анализ кода...');

  const stats = collectStats(projectRoot);

  if (stats.length === 0) {
    console.log('⚠️  Пакеты не найдены');
    return;
  }

  printResults(stats);
}

main();
