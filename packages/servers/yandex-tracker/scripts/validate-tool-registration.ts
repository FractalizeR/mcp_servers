/**
 * Валидация регистрации Tools и Operations для Yandex Tracker
 *
 * Использует универсальный валидатор из @fractalizer/mcp-core для проверки
 * регистрации (все *.tool.ts / *.operation.ts должны быть перечислены в
 * definitions), но НЕ использует его встроенную проверку
 * `requiresExplicitUserConsent` (`validateSafetyFlags` в
 * tool-registration-validator.ts): та эвристика ищет подстроки в имени
 * инструмента (`update`, `delete`, `bulk`, …) и не ловит ни `create`, ни
 * `clone`, ни `add`/`upload`/`remove` — три сервера monorepo независимо
 * набрали три разных списка паттернов, которые давно разъехались.
 *
 * Решение владельца (см. .agentic-planning/plan_mcp_2026_modernization):
 * `requiresExplicitUserConsent` обязан совпадать с `annotations.destructiveHint`.
 * `destructiveHint` — осознанная классификация по смыслу операции (пакет 3.1.C),
 * а не название; проверка на РАВЕНСТВО двух полей не зависит от имени вовсе.
 *
 * Запуск: npm run validate:tools
 */

import { resolve } from 'node:path';
import { getScriptDir, validateToolRegistration } from '@fractalizer/mcp-core';
import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';
import { OPERATION_CLASSES } from '../src/composition-root/definitions/operation-definitions.js';

const scriptDir = getScriptDir(import.meta.url);

/**
 * Проверка совпадения requiresExplicitUserConsent и annotations.destructiveHint
 * для каждого зарегистрированного Tool.
 *
 * Единственное машинное правило: оба поля обязаны совпадать (Boolean-эквивалент,
 * `undefined` трактуется как `false`). Ничего не выводится из имени инструмента.
 */
function validateConsentMatchesDestructiveHint(): string[] {
  const errors: string[] = [];

  for (const ToolClass of TOOL_CLASSES) {
    const metadata = ToolClass.METADATA;
    if (!metadata) continue;

    const consent = Boolean(metadata.requiresExplicitUserConsent);
    const destructiveHint = Boolean(metadata.annotations?.destructiveHint);

    if (consent !== destructiveHint) {
      errors.push(
        `❌ ${metadata.name}: requiresExplicitUserConsent (${consent}) !== ` +
          `annotations.destructiveHint (${destructiveHint})\n` +
          `   Class: ${ToolClass.name}\n` +
          `   Правило: requiresExplicitUserConsent ставится ТОЛЬКО необратимым операциям ` +
          `(удаление сущности, снятие всех прав разом, полная перезапись без пути отката, ` +
          `замена списка целиком) — ровно тем, у кого destructiveHint: true.`
      );
    }
  }

  return errors;
}

async function main(): Promise<void> {
  // 1. Регистрация Tools/Operations — используем существующий валидатор
  // framework, но игнорируем его safetyErrors/safetyWarnings (name-heuristic,
  // заменена проверкой ниже).
  const registrationResult = await validateToolRegistration({
    serverName: 'yandex-tracker',
    srcPath: resolve(scriptDir, '../src'),
    toolsPath: 'tools',
    toolClasses: TOOL_CLASSES,
    operationClasses: OPERATION_CLASSES,
    operationsPath: 'tracker_api/api_operations',
  });

  let hasErrors = false;

  if (registrationResult.unregisteredTools.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Tools:');
    registrationResult.unregisteredTools.forEach((tool) => console.error(`   - ${tool}`));
    console.error(
      '\n💡 Добавь их в packages/servers/yandex-tracker/src/composition-root/definitions/tool-definitions.ts\n'
    );
  }

  if (registrationResult.unregisteredOperations.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Operations:');
    registrationResult.unregisteredOperations.forEach((op) => console.error(`   - ${op}`));
    console.error(
      '\n💡 Добавь их в packages/servers/yandex-tracker/src/composition-root/definitions/operation-definitions.ts\n'
    );
  }

  // 2. requiresExplicitUserConsent === annotations.destructiveHint
  const consentErrors = validateConsentMatchesDestructiveHint();
  if (consentErrors.length > 0) {
    hasErrors = true;
    console.error('❌ requiresExplicitUserConsent не совпадает с annotations.destructiveHint:\n');
    consentErrors.forEach((error) => console.error(`${error}\n`));
  }

  console.log(`🔍 Проверка регистрации компонентов yandex-tracker...\n`);

  if (hasErrors) {
    process.exit(1);
  }

  console.log('✅ Все проверки пройдены');
  console.log(`   Tools: ${registrationResult.stats.totalTools}`);
  console.log(`   Operations: ${registrationResult.stats.totalOperations}`);
  console.log(
    `   Tools с requiresExplicitUserConsent: ${registrationResult.stats.toolsWithConsent}`
  );
}

main().catch((error) => {
  console.error('❌ Ошибка при валидации:', error);
  process.exit(1);
});
