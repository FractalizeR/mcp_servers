/**
 * Универсальный валидатор регистрации Tools
 *
 * Проверяет:
 * 1. Что все Tool классы зарегистрированы в definitions
 * 2. Корректность флага requiresExplicitUserConsent
 *
 * Используется всеми MCP серверами через конфигурацию.
 */

import { readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Интерфейс для Tool класса с метаданными
 */
export interface ToolClassWithMetadata {
  name: string;
  METADATA?: {
    name: string;
    requiresExplicitUserConsent?: boolean;
    isHelper?: boolean;
  };
}

/**
 * Интерфейс для Operation класса
 */
export interface OperationClass {
  name: string;
}

/**
 * Конфигурация валидатора
 */
export interface ToolValidatorConfig {
  /** Название сервера для сообщений */
  serverName: string;

  /** Путь к директории src относительно скрипта */
  srcPath: string;

  /** Путь к директории tools относительно src */
  toolsPath: string;

  /** Массив зарегистрированных Tool классов */
  toolClasses: readonly ToolClassWithMetadata[];

  /** Паттерны для исключения из поиска tools */
  toolExcludePatterns?: RegExp[];

  /** Паттерны деструктивных операций (требуют consent) */
  destructivePatterns?: string[];

  /** Паттерны read-only операций (не требуют consent) */
  readOnlyPatterns?: string[];

  /** Опционально: массив зарегистрированных Operation классов */
  operationClasses?: readonly OperationClass[];

  /** Опционально: путь к директории operations относительно src */
  operationsPath?: string;

  /** Опционально: паттерны для исключения из поиска operations */
  operationExcludePatterns?: RegExp[];
}

/**
 * Результат валидации флагов безопасности
 */
export interface SafetyValidationResult {
  errors: string[];
  warnings: string[];
}

/**
 * Полный результат валидации регистрации
 */
export interface ToolValidationResult {
  success: boolean;
  unregisteredTools: string[];
  unregisteredOperations: string[];
  safetyErrors: string[];
  safetyWarnings: string[];
  stats: {
    totalTools: number;
    totalOperations: number;
    toolsWithConsent: number;
  };
}

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
  const match = filePath.match(new RegExp(`([a-zA-Z][a-z0-9-]+)\\.${suffix}\\.ts$`, 'i'));
  if (!match?.[1]) return null;

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
async function findUnregisteredTools(config: ToolValidatorConfig): Promise<string[]> {
  const toolsDir = resolve(config.srcPath, config.toolsPath);

  const defaultExcludes = [/base-tool\.ts$/, /\/base\//];
  const excludePatterns = [...defaultExcludes, ...(config.toolExcludePatterns ?? [])];

  const toolFiles = await findFiles(toolsDir, /\.tool\.ts$/, excludePatterns);

  const registeredTools = config.toolClasses.map((ToolClass) => ToolClass.name);
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
 * Проверка регистрации Operations (опционально)
 */
async function findUnregisteredOperations(config: ToolValidatorConfig): Promise<string[]> {
  if (!config.operationClasses || !config.operationsPath) {
    return [];
  }

  const operationsDir = resolve(config.srcPath, config.operationsPath);

  const defaultExcludes = [/base-operation\.ts$/, /\/base\//];
  const excludePatterns = [...defaultExcludes, ...(config.operationExcludePatterns ?? [])];

  const operationFiles = await findFiles(operationsDir, /\.operation\.ts$/, excludePatterns);

  const registeredOperations = config.operationClasses.map((OpClass) => OpClass.name);
  const unregisteredOperations: string[] = [];

  for (const filePath of operationFiles) {
    const className = extractClassName(filePath, 'operation');
    if (className && !registeredOperations.includes(className)) {
      unregisteredOperations.push(`${className} (${filePath})`);
    }
  }

  return unregisteredOperations;
}

/**
 * Валидация флага requiresExplicitUserConsent
 */
function validateSafetyFlags(config: ToolValidatorConfig): SafetyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Дефолтные паттерны
  const destructivePatterns = config.destructivePatterns ?? ['update', 'delete', 'bulk', 'batch'];
  const readOnlyPatterns = config.readOnlyPatterns ?? ['get', 'find', 'search', 'list'];

  for (const ToolClass of config.toolClasses) {
    const metadata = ToolClass.METADATA;
    if (!metadata) continue;

    const { name, requiresExplicitUserConsent, isHelper } = metadata;

    // Пропускаем helper tools (они не работают с данными)
    if (isHelper) continue;

    const nameLower = name.toLowerCase();

    // Проверка 1: Деструктивные операции должны иметь флаг
    // Исключаем read-only операции — проверяем наличие read-only паттерна как отдельного слова (с _ вокруг)
    // Например: "fr_yandex_tracker_get_bulk_change_status" содержит "_get_" → read-only
    const isDestructive = destructivePatterns.some((pattern) => nameLower.includes(pattern));
    const isReadOnly = readOnlyPatterns.some(
      (pattern) => nameLower.includes(`_${pattern}_`) || nameLower.startsWith(`${pattern}_`)
    );

    if (isDestructive && !isReadOnly) {
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
export async function validateToolRegistration(
  config: ToolValidatorConfig
): Promise<ToolValidationResult> {
  const [unregisteredTools, unregisteredOperations] = await Promise.all([
    findUnregisteredTools(config),
    findUnregisteredOperations(config),
  ]);

  const safetyValidation = validateSafetyFlags(config);

  const toolsWithConsent = config.toolClasses.filter(
    (t) => t.METADATA?.requiresExplicitUserConsent
  ).length;

  return {
    success:
      unregisteredTools.length === 0 &&
      unregisteredOperations.length === 0 &&
      safetyValidation.errors.length === 0,
    unregisteredTools,
    unregisteredOperations,
    safetyErrors: safetyValidation.errors,
    safetyWarnings: safetyValidation.warnings,
    stats: {
      totalTools: config.toolClasses.length,
      totalOperations: config.operationClasses?.length ?? 0,
      toolsWithConsent,
    },
  };
}

/**
 * Запуск валидации с выводом в консоль и exit code
 */
export async function runValidation(config: ToolValidatorConfig): Promise<void> {
  console.log(`🔍 Проверка регистрации компонентов ${config.serverName}...\n`);

  const result = await validateToolRegistration(config);
  let hasErrors = false;

  // Проверка регистрации Tools
  if (result.unregisteredTools.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Tools:');
    result.unregisteredTools.forEach((tool) => console.error(`   - ${tool}`));
    console.error(
      `\n💡 Добавь их в packages/servers/${config.serverName}/src/composition-root/definitions/tool-definitions.ts\n`
    );
  }

  // Проверка регистрации Operations
  if (result.unregisteredOperations.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Operations:');
    result.unregisteredOperations.forEach((op) => console.error(`   - ${op}`));
    console.error(
      `\n💡 Добавь их в packages/servers/${config.serverName}/src/composition-root/definitions/operation-definitions.ts\n`
    );
  }

  // Проверка флага requiresExplicitUserConsent
  if (result.safetyErrors.length > 0) {
    hasErrors = true;
    console.error('❌ Ошибки в флагах requiresExplicitUserConsent:\n');
    result.safetyErrors.forEach((error) => console.error(`${error}\n`));
    console.error('💡 Добавь requiresExplicitUserConsent: true в METADATA опасных tools\n');
  }

  // Предупреждения (не блокируют выполнение)
  if (result.safetyWarnings.length > 0) {
    console.warn('⚠️  Предупреждения о флагах requiresExplicitUserConsent:\n');
    result.safetyWarnings.forEach((warning) => console.warn(`${warning}\n`));
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('✅ Все проверки пройдены');
  console.log(`   Tools: ${result.stats.totalTools}`);
  if (result.stats.totalOperations > 0) {
    console.log(`   Operations: ${result.stats.totalOperations}`);
  }
  console.log(`   Tools с requiresExplicitUserConsent: ${result.stats.toolsWithConsent}`);
}

/**
 * Получить путь к директории скрипта (для ESM модулей)
 */
export function getScriptDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}
