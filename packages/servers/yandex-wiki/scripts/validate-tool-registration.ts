/**
 * Валидация регистрации Tools для Yandex Wiki
 *
 * Использует универсальный валидатор из @fractalizer/mcp-core для проверки
 * регистрации Tool-классов в composition-root, плюс собственную проверку
 * согласия/деструктивности (см. ниже).
 *
 * Запуск: npm run validate:tools
 */

import { resolve } from 'node:path';
import {
  validateToolRegistration,
  getScriptDir,
  validateRedactionAllowlist,
} from '@fractalizer/mcp-core';
import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';

const scriptDir = getScriptDir(import.meta.url);

/**
 * Правило владельца: `requiresExplicitUserConsent` обязан совпадать с
 * `annotations.destructiveHint`. Разрушающие операции (удаление сущности,
 * снятие всех прав разом, полная перезапись содержимого без пути отката,
 * замена списка целиком) требуют явного согласия; изменение отдельных
 * полей (есть история отката) и создание (обратимо удалением) — нет.
 *
 * Старая эвристика фреймворка (`destructivePatterns`/`readOnlyPatterns` —
 * подстроки в имени инструмента) не ловила `create`/`clone`/`add`/`move`/
 * `remove`/`append`/`upload`, поэтому отключена ниже (пустые массивы
 * паттернов передаются в `validateToolRegistration`) и заменена точной
 * проверкой соответствия полей.
 */
function validateConsentMatchesDestructiveHint(): string[] {
  const errors: string[] = [];

  for (const ToolClass of TOOL_CLASSES) {
    const metadata = ToolClass.METADATA;
    const consent = metadata.requiresExplicitUserConsent ?? false;
    const destructive = metadata.annotations?.destructiveHint ?? false;

    if (consent !== destructive) {
      errors.push(
        `❌ ${metadata.name}: requiresExplicitUserConsent (${consent}) должен совпадать ` +
          `с annotations.destructiveHint (${destructive})\n   Class: ${ToolClass.name}`
      );
    }
  }

  return errors;
}

async function main(): Promise<void> {
  console.log('🔍 Проверка регистрации компонентов yandex-wiki...\n');

  const result = await validateToolRegistration({
    serverName: 'yandex-wiki',
    srcPath: resolve(scriptDir, '../src'),
    toolsPath: 'tools',
    toolClasses: TOOL_CLASSES,

    // Подстрочная эвристика деструктивности отключена — см. JSDoc
    // validateConsentMatchesDestructiveHint выше.
    destructivePatterns: [],
    readOnlyPatterns: [],
  });

  let hasErrors = false;

  if (result.unregisteredTools.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Tools:');
    result.unregisteredTools.forEach((tool) => console.error(`   - ${tool}`));
    console.error(
      '\n💡 Добавь их в packages/servers/yandex-wiki/src/composition-root/definitions/tool-definitions.ts\n'
    );
  }

  if (result.unregisteredOperations.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Operations:');
    result.unregisteredOperations.forEach((op) => console.error(`   - ${op}`));
  }

  const consentErrors = validateConsentMatchesDestructiveHint();
  if (consentErrors.length > 0) {
    hasErrors = true;
    console.error('❌ requiresExplicitUserConsent не совпадает с destructiveHint:\n');
    consentErrors.forEach((error) => console.error(`${error}\n`));
    console.error(
      '💡 Разрушающие операции (удаление, снятие всех прав, полная перезапись без отката, ' +
        'замена списка целиком) — requiresExplicitUserConsent: true и destructiveHint: true.\n' +
        '   Остальные — оба false.\n'
    );
  }

  const redactionAllowlistErrors = validateRedactionAllowlist(TOOL_CLASSES);
  if (redactionAllowlistErrors.length > 0) {
    hasErrors = true;
    console.error('❌ redactionAllowlist расходится со схемой параметров:\n');
    redactionAllowlistErrors.forEach((error) => console.error(`   ${error}`));
    console.error('');
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

main().catch((error: unknown) => {
  console.error('❌ Ошибка при валидации:', error);
  process.exit(1);
});
