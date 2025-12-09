/**
 * Валидация регистрации Tools
 *
 * Проверяет, что все Tool классы зарегистрированы в definitions/
 *
 * Запуск: npm run validate:tools
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';

/**
 * Рекурсивный поиск файлов по паттерну
 */
async function findFiles(
  dir: string,
  pattern: RegExp,
  excludePatterns: RegExp[] = []
): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Проверка на исключения
      if (excludePatterns.some((p) => p.test(fullPath))) continue;

      if (entry.isDirectory()) {
        const subResults = await findFiles(fullPath, pattern, excludePatterns);
        results.push(...subResults);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Игнорируем ошибки доступа
  }

  return results;
}

/**
 * Извлечение имени класса из пути к файлу
 * Пример: 'src/tools/api/pages/get-page.tool.ts' → 'GetPageTool'
 */
function extractClassName(filePath: string, suffix: string): string | null {
  const match = filePath.match(new RegExp(`([A-Z][a-z0-9-]+)\\.${suffix}\\.ts$`, 'i'));
  if (!match) return null;

  // Конвертируем kebab-case в PascalCase
  const kebabName = match[1];
  const pascalName = kebabName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return pascalName + suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

/**
 * Проверка регистрации Tools
 */
async function validateTools(): Promise<string[]> {
  const toolFiles = await findFiles('../src/tools', /\.tool\.ts$/, [/base-tool\.ts$/, /\/base\//]);

  const registeredTools = TOOL_CLASSES.map((ToolClass) => ToolClass.name);
  const unregisteredTools: string[] = [];

  for (const filePath of toolFiles) {
    const className = extractClassName(filePath, 'tool');
    if (className && !registeredTools.includes(className)) {
      unregisteredTools.push(`${className} (${filePath})`);
    }
  }

  return unregisteredTools;
}

/**
 * Основная функция валидации
 */
async function main(): Promise<void> {
  console.log('🔍 Проверка регистрации Tools...\n');

  const unregisteredTools = await validateTools();

  let hasErrors = false;

  // Проверка регистрации Tools
  if (unregisteredTools.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Tools:');
    unregisteredTools.forEach((tool) => console.error(`   - ${tool}`));
    console.error(
      '\n💡 Добавь их в packages/servers/yandex-wiki/src/composition-root/definitions/tool-definitions.ts\n'
    );
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('✅ Все проверки пройдены');
  console.log(`   Tools: ${TOOL_CLASSES.length}`);
}

main().catch((error) => {
  console.error('❌ Ошибка при валидации:', error);
  process.exit(1);
});
