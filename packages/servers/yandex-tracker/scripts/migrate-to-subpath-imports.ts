#!/usr/bin/env tsx
/* eslint-disable */
/**
 * Миграционный скрипт: TypeScript path aliases → Node.js Subpath Imports
 *
 * Заменяет:
 * 1. @ алиасы → # префиксы (@tracker_api/* → #tracker_api/*)
 * 2. Глубокие относительные пути → # префиксы (../../../constants.js → #constants)
 *
 * Использование:
 *   npm run migrate:subpath-imports -- --dry-run       # Показать изменения без применения
 *   npm run migrate:subpath-imports -- --apply         # Применить изменения
 *   npm run migrate:subpath-imports -- --apply --verbose
 */

import * as fs from 'node:fs';
import { glob } from 'glob';

// ========================================================================================
// Типы
// ========================================================================================

interface MigrationPattern {
  name: string;
  regex: RegExp;
  replacement: string;
  description: string;
}

interface MigrationResult {
  filePath: string;
  replacements: number;
  patterns: string[];
  success: boolean;
  error?: string;
}

interface MigrationStats {
  filesProcessed: number;
  filesChanged: number;
  totalReplacements: number;
  patternStats: Record<string, number>;
  errors: string[];
}

// ========================================================================================
// Паттерны миграции
// ========================================================================================

/** Паттерны для замены @ алиасов → # префиксы */
const ALIAS_PATTERNS: MigrationPattern[] = [
  {
    name: 'tracker_api',
    regex: /from ['"]@tracker_api\/([^'"]+)['"]/g,
    replacement: "from '#tracker_api/$1'",
    description: 'Tracker API слой',
  },
  {
    name: 'integration',
    regex: /from ['"]@integration\/([^'"]+)['"]/g,
    replacement: "from '#integration/$1'",
    description: 'Интеграционные тесты',
  },
  {
    name: 'tools',
    regex: /from ['"]@tools\/([^'"]+)['"]/g,
    replacement: "from '#tools/$1'",
    description: 'MCP Tools',
  },
  {
    name: 'constants_alias',
    regex: /from ['"]@constants['"]/g,
    replacement: "from '#constants'",
    description: 'Константы проекта (@ alias)',
  },
  {
    name: 'helpers',
    regex: /from ['"]@helpers\/([^'"]+)['"]/g,
    replacement: "from '#helpers/$1'",
    description: 'Тестовые helpers',
  },
  {
    name: 'cli',
    regex: /from ['"]@cli\/([^'"]+)['"]/g,
    replacement: "from '#cli/$1'",
    description: 'CLI модули',
  },
  {
    name: 'composition-root',
    regex: /from ['"]@composition-root\/([^'"]+)['"]/g,
    replacement: "from '#composition-root/$1'",
    description: 'DI Composition Root',
  },
];

/** Паттерны для замены глубоких относительных путей → # префиксы */
const RELATIVE_PATTERNS: MigrationPattern[] = [
  {
    name: 'constants_relative',
    regex: /from ['"](?:\.\.\/){3,}constants\.js['"]/g,
    replacement: "from '#constants'",
    description: 'Константы (относительные пути ≥3 уровня)',
  },
  {
    name: 'common_relative',
    regex: /from ['"](?:\.\.\/){3,}common\/([^'"]+)['"]/g,
    replacement: "from '#common/$1'",
    description: 'Общие модули (относительные пути ≥3 уровня)',
  },
  {
    name: 'helpers_relative',
    regex: /from ['"](?:\.\.\/){3,}helpers\/([^'"]+)['"]/g,
    replacement: "from '#helpers/$1'",
    description: 'Test helpers (относительные пути ≥3 уровня)',
  },
];

/** Паттерны для dynamic imports */
const DYNAMIC_PATTERNS: MigrationPattern[] = [
  {
    name: 'tracker_api_dynamic',
    regex: /import\(['"]@tracker_api\/([^'"]+)['"]\)/g,
    replacement: "import('#tracker_api/$1')",
    description: 'Dynamic imports для Tracker API',
  },
  {
    name: 'tools_dynamic',
    regex: /import\(['"]@tools\/([^'"]+)['"]\)/g,
    replacement: "import('#tools/$1')",
    description: 'Dynamic imports для Tools',
  },
];

/** Все паттерны вместе */
const ALL_PATTERNS = [...ALIAS_PATTERNS, ...RELATIVE_PATTERNS, ...DYNAMIC_PATTERNS];

/** Паттерны для исключения (НЕ заменять!) */
const EXCLUDED_PATTERNS = [
  /@mcp-framework\//,
  /@modelcontextprotocol\//,
  /@iarna\//,
  /@anthropic-ai\//,
];

// ========================================================================================
// Функции
// ========================================================================================

/**
 * Проверяет, содержит ли строка исключённый паттерн
 */
function isExcludedImport(line: string): boolean {
  return EXCLUDED_PATTERNS.some((pattern) => pattern.test(line));
}

/**
 * Находит все TypeScript файлы для миграции
 */
async function findFilesToMigrate(srcOnly: boolean, testsOnly: boolean): Promise<string[]> {
  const patterns: string[] = [];

  if (!testsOnly) patterns.push('src/**/*.ts');
  if (!srcOnly) patterns.push('tests/**/*.ts');

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**'],
      absolute: false,
    });
    files.push(...matches);
  }

  return files.sort();
}

/**
 * Мигрирует один файл
 */
function migrateFile(filePath: string, dryRun: boolean, verbose: boolean): MigrationResult {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = originalContent;
    let totalReplacements = 0;
    const appliedPatterns: string[] = [];

    // Применяем каждый паттерн
    for (const pattern of ALL_PATTERNS) {
      let replacements = 0;
      modifiedContent = modifiedContent.replace(pattern.regex, (match, ...args) => {
        // Проверяем, не исключён ли этот импорт
        if (isExcludedImport(match)) {
          return match; // Не заменяем
        }

        replacements++;
        totalReplacements++;
        return pattern.replacement.replace(/\$(\d+)/g, (_, num) => args[parseInt(num) - 1]);
      });

      if (replacements > 0) {
        appliedPatterns.push(`${pattern.name} (${replacements}x)`);
        if (verbose) {
          console.log(`  ✓ ${pattern.name}: ${replacements} замен`);
        }
      }
    }

    // Если были изменения и это не dry-run, записываем файл
    if (totalReplacements > 0 && !dryRun) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
    }

    return {
      filePath,
      replacements: totalReplacements,
      patterns: appliedPatterns,
      success: true,
    };
  } catch (error) {
    return {
      filePath,
      replacements: 0,
      patterns: [],
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Генерирует отчёт о миграции
 */
function generateReport(results: MigrationResult[], stats: MigrationStats): void {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 ОТЧЁТ О МИГРАЦИИ');
  console.log('═'.repeat(80));

  console.log('\n📈 Общая статистика:');
  console.log(`  • Обработано файлов: ${stats.filesProcessed}`);
  console.log(`  • Изменено файлов: ${stats.filesChanged}`);
  console.log(`  • Всего замен: ${stats.totalReplacements}`);

  if (Object.keys(stats.patternStats).length > 0) {
    console.log('\n📋 Статистика по паттернам:');
    const sorted = Object.entries(stats.patternStats).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted) {
      const pattern = ALL_PATTERNS.find((p) => p.name === name);
      console.log(`  • ${name}: ${count} замен — ${pattern?.description || ''}`);
    }
  }

  if (stats.errors.length > 0) {
    console.log('\n❌ Ошибки:');
    for (const error of stats.errors) {
      console.log(`  • ${error}`);
    }
  }

  const changedFiles = results.filter((r) => r.replacements > 0);
  if (changedFiles.length > 0 && changedFiles.length <= 20) {
    console.log('\n📝 Изменённые файлы:');
    for (const result of changedFiles) {
      console.log(`  • ${result.filePath} (${result.replacements} замен)`);
    }
  } else if (changedFiles.length > 20) {
    console.log(`\n📝 Изменено ${changedFiles.length} файлов (слишком много для вывода)`);
  }

  console.log('\n' + '═'.repeat(80));
}

/**
 * Основная функция миграции
 */
async function migrate(options: {
  dryRun: boolean;
  verbose: boolean;
  srcOnly: boolean;
  testsOnly: boolean;
}): Promise<void> {
  const { dryRun, verbose, srcOnly, testsOnly } = options;

  console.log('🚀 Миграция TypeScript path aliases → Node.js Subpath Imports\n');
  console.log(
    `Режим: ${dryRun ? '🔍 DRY RUN (без изменений)' : '✏️  APPLY (применение изменений)'}`
  );
  console.log(`Verbose: ${verbose ? 'ДА' : 'НЕТ'}`);
  console.log('');

  // Находим файлы
  console.log('🔎 Поиск файлов для миграции...');
  const files = await findFilesToMigrate(srcOnly, testsOnly);
  console.log(`Найдено файлов: ${files.length}\n`);

  if (files.length === 0) {
    console.log('❌ Нет файлов для миграции');
    return;
  }

  // Обрабатываем файлы
  console.log('⚙️  Обработка файлов...\n');
  const results: MigrationResult[] = [];
  const stats: MigrationStats = {
    filesProcessed: 0,
    filesChanged: 0,
    totalReplacements: 0,
    patternStats: {},
    errors: [],
  };

  for (const file of files) {
    if (verbose) {
      console.log(`Обработка: ${file}`);
    }

    const result = migrateFile(file, dryRun, verbose);
    results.push(result);
    stats.filesProcessed++;

    if (result.success) {
      if (result.replacements > 0) {
        stats.filesChanged++;
        stats.totalReplacements += result.replacements;

        // Обновляем статистику по паттернам
        for (const pattern of result.patterns) {
          const name = pattern.split(' (')[0] ?? pattern;
          stats.patternStats[name] = (stats.patternStats[name] || 0) + 1;
        }
      }
    } else {
      stats.errors.push(`${file}: ${result.error}`);
    }

    if (verbose && result.replacements > 0) {
      console.log('');
    }
  }

  // Генерируем отчёт
  generateReport(results, stats);

  if (dryRun && stats.filesChanged > 0) {
    console.log('\n💡 Для применения изменений запустите:');
    console.log('   npm run migrate:subpath-imports -- --apply\n');
  }
}

// ========================================================================================
// CLI
// ========================================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const verbose = args.includes('--verbose');
  const srcOnly = args.includes('--src-only');
  const testsOnly = args.includes('--tests-only');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Использование:
  npm run migrate:subpath-imports -- [опции]

Опции:
  --dry-run        Показать изменения без применения (по умолчанию)
  --apply          Применить изменения
  --verbose        Подробный вывод
  --src-only       Только src/ директория
  --tests-only     Только tests/ директория
  --help, -h       Показать эту справку

Примеры:
  npm run migrate:subpath-imports -- --dry-run
  npm run migrate:subpath-imports -- --apply --verbose
  npm run migrate:subpath-imports -- --apply --src-only
`);
    return;
  }

  await migrate({ dryRun, verbose, srcOnly, testsOnly });
}

main().catch((error) => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});
