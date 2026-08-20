#!/usr/bin/env tsx
/**
 * Храповик контракта MCP-инструментов (план `plan_tool_contract_unification`, 3.1)
 *
 * Не даёт разнобою имён и форм, устранённому этим планом, вернуться по одному
 * инструменту за раз — ровно так он и накопился в первый раз (см. README §1,
 * INVENTORY_contract_fixes.md).
 *
 * Проверяет ОБЪЯВЛЕНИЯ ПОЛЕЙ В ZOD-СХЕМАХ (`*.schema.ts`), а не весь `src/`:
 * - `src/resources/tracker-resource-uri.ts` и `issue-resource-provider.ts` называют
 *   локальную переменную `issueKey` — это НЕ параметр контракта инструмента, и грепать
 *   их по всему `src/` означало бы либо ложные срабатывания, либо бессмысленные
 *   переименования локальных переменных ради самого храповика.
 *
 * Слепое пятно (осознанное, не баг этого скрипта): `successful`, собранный на стороне
 * `*.tool.ts` (`processed.successful.map(...)` → `{ issueId, ...item.data }`), этому
 * храповику не виден — там форма представлена рантайм-объектом, а не Zod-полем. Форму
 * ответа держит контрактный тест `tool-output-schema-representatives.test.ts`
 * (см. tests/TESTING_STRATEGY.md §5); этот скрипт — только дешёвое дублирование на
 * уровне схем, а не замена контрактному тесту.
 */

import { readFileSync } from 'node:fs';
import { globSync } from 'glob';

interface Violation {
  file: string;
  line: number;
  text: string;
  reason: string;
}

const SCHEMA_GLOB = 'packages/**/*.schema.ts';
const IGNORE = ['**/node_modules/**', '**/dist/**'];

// Имена параметров контракта инструмента, запрещённые в объявлениях полей Zod-схем
// (README §1 — таблица переименований). Матчим только `<имя>: z.` — объявление поля
// схемы, а не строку в `.describe()` и не доступ к свойству через точку.
const FORBIDDEN_FIELD_NAMES = [
  'issueKey',
  'issueKeys',
  'keys',
  'targetIssue',
  'issues',
  'transition',
];
const FIELD_DECL_RE = new RegExp(
  `(?:^\\s*|[{,]\\s*)(${FORBIDDEN_FIELD_NAMES.join('|')})\\s*:\\s*z\\.`
);

const FIELDS_RETURNED_RE = /\bfieldsReturned\b/;
const SUCCESSFUL_NUMBER_RE = /\bsuccessful\s*:\s*z\.number\s*\(/;

function checkFile(path: string): Violation[] {
  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  const violations: Violation[] = [];

  lines.forEach((line, idx) => {
    if (FIELDS_RETURNED_RE.test(line)) {
      violations.push({
        file: path,
        line: idx + 1,
        text: line.trim(),
        reason: 'fieldsReturned — удалённое эхо входного параметра fields (README §1)',
      });
    }
    if (SUCCESSFUL_NUMBER_RE.test(line)) {
      violations.push({
        file: path,
        line: idx + 1,
        text: line.trim(),
        reason: 'successful объявлен числом — batch-канон требует массива (canon §5)',
      });
    }
    const fieldMatch = FIELD_DECL_RE.exec(line);
    if (fieldMatch) {
      violations.push({
        file: path,
        line: idx + 1,
        text: line.trim(),
        reason: `имя параметра "${fieldMatch[1]}" запрещено в схеме — используй issueId/issueIds/transitionId/targetIssueId (README §1)`,
      });
    }
  });

  return violations;
}

function main(): void {
  const files = globSync(SCHEMA_GLOB, { ignore: IGNORE });
  const violations = files.flatMap(checkFile);

  if (violations.length === 0) {
    console.log(`✅ Храповик контракта MCP-инструментов: ${files.length} схем чисты`);
    return;
  }

  console.error(`❌ Храповик контракта MCP-инструментов: ${violations.length} нарушени(й)\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.text}`);
    console.error(`    → ${v.reason}\n`);
  }
  process.exit(1);
}

main();
