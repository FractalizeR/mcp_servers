/**
 * Валидация регистрации Tools для TickTick
 *
 * Использует универсальный поиск незарегистрированных Tools/Operations из
 * @fractalizer/mcp-core (validateToolRegistration), но НЕ его встроенную
 * проверку requiresExplicitUserConsent — та определяет «деструктивность» по
 * подстроке в имени инструмента (destructivePatterns) и не ловит create/
 * clone/add/upload/remove (H1 отчёта REVIEW_MCP_SDK_FINDINGS.md: три сервера
 * держали три разных списка паттернов, ни один не покрывал полный набор).
 *
 * Правило владельца (2026-08-14): requiresExplicitUserConsent обязан
 * СОВПАДАТЬ с annotations.destructiveHint — единственный источник истины о
 * разрушительности операции (создание/удаление/классификация по смыслу, а
 * не по имени). Эта проверка ниже сверяет оба поля напрямую по METADATA
 * каждого зарегистрированного инструмента.
 *
 * Запуск: npm run validate:tools
 */

import { resolve } from 'node:path';
import { validateToolRegistration, getScriptDir } from '@fractalizer/mcp-core';
import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';

const scriptDir = getScriptDir(import.meta.url);

interface ConsentMismatch {
  toolName: string;
  className: string;
  requiresExplicitUserConsent: boolean;
  destructiveHint: boolean;
}

/**
 * Сверяет METADATA.requiresExplicitUserConsent и METADATA.annotations.destructiveHint
 * для каждого зарегистрированного tool класса. Оба поля опциональны — отсутствие
 * трактуется как `false` (соответствует дефолтам StaticToolMetadata/ToolAnnotations).
 */
function findConsentDestructiveMismatches(): ConsentMismatch[] {
  const mismatches: ConsentMismatch[] = [];

  for (const ToolClass of TOOL_CLASSES) {
    const metadata = ToolClass.METADATA;
    const requiresExplicitUserConsent = metadata.requiresExplicitUserConsent ?? false;
    const destructiveHint = metadata.annotations?.destructiveHint ?? false;

    if (requiresExplicitUserConsent !== destructiveHint) {
      mismatches.push({
        toolName: metadata.name,
        className: ToolClass.name,
        requiresExplicitUserConsent,
        destructiveHint,
      });
    }
  }

  return mismatches;
}

async function main(): Promise<void> {
  console.log('🔍 Проверка регистрации компонентов ticktick...\n');

  // Незарегистрированные Tools/Operations — по-прежнему через общий валидатор
  // framework (эта часть не завязана на подстрочную эвристику).
  const registration = await validateToolRegistration({
    serverName: 'ticktick',
    srcPath: resolve(scriptDir, '../src'),
    toolsPath: 'tools',
    toolClasses: TOOL_CLASSES,
    // Исключаем shared/ директорию - это утилиты, а не tools
    toolExcludePatterns: [/\/shared\//],
  });

  let hasErrors = false;

  if (registration.unregisteredTools.length > 0) {
    hasErrors = true;
    console.error('❌ Незарегистрированные Tools:');
    registration.unregisteredTools.forEach((tool) => console.error(`   - ${tool}`));
    console.error(
      '\n💡 Добавь их в packages/servers/ticktick/src/composition-root/definitions/tool-definitions.ts\n'
    );
  }

  // Правило владельца: requiresExplicitUserConsent === annotations.destructiveHint.
  const consentMismatches = findConsentDestructiveMismatches();

  if (consentMismatches.length > 0) {
    hasErrors = true;
    console.error('❌ Расхождение requiresExplicitUserConsent и annotations.destructiveHint:\n');
    consentMismatches.forEach((m) => {
      console.error(
        `   - ${m.toolName} (${m.className}): requiresExplicitUserConsent=${m.requiresExplicitUserConsent}, ` +
          `destructiveHint=${m.destructiveHint} — должны совпадать\n`
      );
    });
    console.error(
      '💡 Выставь оба поля в одинаковое значение: true — для разрушающих операций ' +
        '(удаление сущности, полная перезапись без пути отката, замена списка целиком), ' +
        'false — для всего остального (включая создание — обратимо удалением, ' +
        'и обновление отдельных полей — обратимо повторным вызовом)\n'
    );
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('✅ Все проверки пройдены');
  console.log(`   Tools: ${registration.stats.totalTools}`);
  console.log(
    `   Tools с requiresExplicitUserConsent: ${registration.stats.toolsWithConsent} (совпадает с destructiveHint у всех)`
  );
}

main().catch((error) => {
  console.error('❌ Ошибка при валидации:', error);
  process.exit(1);
});
