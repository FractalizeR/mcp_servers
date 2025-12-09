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
 * Пример: 'src/tools/tasks/get-task.tool.ts' → 'GetTaskTool'
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
  // Исключаем shared/ директорию - это утилиты, а не tools
  const toolFiles = await findFiles('../src/tools', /\.tool\.ts$/, [
    /base-tool\.ts$/,
    /\/base\//,
    /\/shared\//,
  ]);

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
 * Валидация флага requiresExplicitUserConsent
 *
 * Проверяет корректность использования флага безопасности:
 * - Опасные операции (update, create, delete, complete, batch) должны иметь флаг
 * - Read-only операции (get, search) НЕ должны иметь флаг
 */
interface SafetyValidationResult {
  errors: string[];
  warnings: string[];
}

async function validateSafetyFlags(): Promise<SafetyValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Паттерны опасных операций в именах tools (без read-only вариантов)
  const dangerousPatterns = ['update', 'create', 'delete', 'complete', 'batch'];
  const readOnlyPatterns = ['get', 'search'];

  for (const ToolClass of TOOL_CLASSES) {
    const metadata = ToolClass.METADATA;
    if (!metadata) continue;

    const { name, requiresExplicitUserConsent, isHelper } = metadata;

    // Пропускаем helper tools (они не работают с данными)
    if (isHelper) continue;

    const nameLower = name.toLowerCase();

    // Проверка 1: Опасные операции должны иметь флаг
    const isDangerous = dangerousPatterns.some((pattern) => nameLower.includes(pattern));
    const isReadOnly = readOnlyPatterns.some((pattern) => nameLower.startsWith(pattern));

    if (isDangerous && !isReadOnly) {
      if (!requiresExplicitUserConsent) {
        errors.push(
          `❌ ${name}: Tool с изменением данных ДОЛЖЕН иметь requiresExplicitUserConsent: true\n` +
            `   Class: ${ToolClass.name}`
        );
      }
    }

    // Проверка 2: Read-only операции НЕ должны иметь флаг
    if (isReadOnly) {
      if (requiresExplicitUserConsent) {
        warnings.push(
          `⚠️  ${name}: Read-only tool имеет requiresExplicitUserConsent: true (возможно ошибка?)\n` +
            `   Class: ${ToolClass.name}`
        );
      }
    }
  }

  return { errors, warnings };
}

/**
 * Основная функция валидации
 */
async function main(): Promise<void> {
  console.log('🔍 Проверка регистрации Tools...\n');

  const [unregisteredTools, safetyValidation] = await Promise.all([
    validateTools(),
    validateSafetyFlags(),
  ]);

  let hasErrors = false;

  // Проверка регистрации Tools
  if (unregisteredTools.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Tools:');
    unregisteredTools.forEach((tool) => console.error(`   - ${tool}`));
    console.error(
      '\n💡 Добавь их в packages/servers/ticktick/src/composition-root/definitions/tool-definitions.ts\n'
    );
  }

  // Проверка флага requiresExplicitUserConsent
  if (safetyValidation.errors.length > 0) {
    hasErrors = true;
    console.error('❌ Ошибки в флагах requiresExplicitUserConsent:\n');
    safetyValidation.errors.forEach((error) => console.error(`${error}\n`));
    console.error('💡 Добавь requiresExplicitUserConsent: true в METADATA опасных tools\n');
  }

  // Предупреждения (не блокируют выполнение)
  if (safetyValidation.warnings.length > 0) {
    console.warn('⚠️  Предупреждения о флагах requiresExplicitUserConsent:\n');
    safetyValidation.warnings.forEach((warning) => console.warn(`${warning}\n`));
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('✅ Все проверки пройдены');
  console.log(`   Tools: ${TOOL_CLASSES.length}`);
  console.log(
    `   Tools с requiresExplicitUserConsent: ${TOOL_CLASSES.filter((t) => t.METADATA?.requiresExplicitUserConsent).length}`
  );
}

main().catch((error) => {
  console.error('❌ Ошибка при валидации:', error);
  process.exit(1);
});
