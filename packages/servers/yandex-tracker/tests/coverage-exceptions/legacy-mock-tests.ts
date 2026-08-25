/**
 * Закрытый перечень интеграционных тестов, написанных ДО фабрики
 * `describeToolIntegration` (план §D.3, `tests/integration/helpers/mock-server.ts`) —
 * единственный источник для клетки `мок (устаревшая оснастка)` в
 * `scripts/build-coverage-matrix.ts`.
 *
 * Снят машинно 2026-08-20 из `tests/COVERAGE_MATRIX.md` (строки со значением
 * `мок (устаревшая оснастка)` до введения храповика) командой:
 *
 *   grep '^| `' tests/COVERAGE_MATRIX.md | awk -F'|' 'NF>=12' | \
 *     grep "мок (устаревшая оснастка)" | \
 *     grep -oE 'tests/integration/tools/[a-zA-Z0-9/_.-]+\.tool\.integration\.test\.ts' | sort -u
 *
 * ХРАПОВИК: список может только СОКРАЩАТЬСЯ. Новый интеграционный тест — ВСЕГДА на
 * фабрике (`describeToolIntegration` или `describeNoHttpToolIntegration`); дописывать
 * сюда строку для нового файла нельзя ни при каких обстоятельствах (найдено ревью
 * оркестратора: файл-заглушка из одной строки-комментария иначе снова обходит C-2 —
 * то же самое, ради чего вводился запрет на файл-заглушку, просто через новую клетку).
 * Единственное легитимное изменение — удаление строки, когда файл переписан на
 * фабрику или удалён.
 *
 * Четыре направления рассинхрона роняют `coverage:check` явной ошибкой (не тихим
 * пересчётом и не молчаливым переползанием в другую клетку), через
 * `validateLegacyMockTestList()` (эта функция) и `validateLegacyMockPathsNotMigrated()`
 * (`scripts/build-coverage-matrix.ts`, нужен `testFileIndex` со знанием про фабрики):
 *
 * 1. `LEGACY_MOCK_TEST_PATHS.size !== LEGACY_MOCK_TEST_BASELINE_COUNT` — перечень
 *    поправили (дописали ИЛИ убрали строку), не тронув число ниже. Без этого барьера
 *    дописанная строка — обычная правка, гейт остаётся зелёным (F4, найдено ревью
 *    оркестратора).
 * 2. путь из перечня, которого больше нет на диске, — файл мигрировал на фабрику
 *    (не в этом виде — см. п.4) или был удалён.
 * 3. путь есть, но файл не похож на реальный тест (меньше `MIN_IT_CALLS`
 *    вызовов `it(`/`MIN_EXPECT_CALLS` вызовов `expect(`) — воспроизведено ревью
 *    оркестратора на уже перечисленном `get-comments.tool.integration.test.ts`,
 *    выпотрошенном до одной строки комментария: без этого барьера обход C-2
 *    воспроизводится на СУЩЕСТВУЮЩЕЙ строке перечня, а не только на новой.
 * 4. путь есть, файл реальный, но уже вызывает
 *    `describeToolIntegration`/`describeNoHttpToolIntegration` для этого инструмента —
 *    строка перечня пережила миграцию на фабрику (F5, найдено ревью оркестратора).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const LEGACY_MOCK_TEST_PATHS: ReadonlySet<string> = new Set([
  'tests/integration/tools/api/checklists/add/add-checklist-item.tool.integration.test.ts',
  'tests/integration/tools/api/checklists/delete/delete-checklist-item.tool.integration.test.ts',
  'tests/integration/tools/api/checklists/get/get-checklist.tool.integration.test.ts',
  'tests/integration/tools/api/checklists/update/update-checklist-item.tool.integration.test.ts',
  'tests/integration/tools/api/comments/add/add-comment.tool.integration.test.ts',
  'tests/integration/tools/api/comments/delete/delete-comment.tool.integration.test.ts',
  'tests/integration/tools/api/comments/edit/edit-comment.tool.integration.test.ts',
  'tests/integration/tools/api/comments/get/get-comments.tool.integration.test.ts',
  'tests/integration/tools/api/components/get/get-components.tool.integration.test.ts',
  'tests/integration/tools/api/components/update/update-component.tool.integration.test.ts',
  'tests/integration/tools/api/issues/attachments/delete/delete-attachment.tool.integration.test.ts',
  'tests/integration/tools/api/issues/attachments/download/download-attachment.tool.integration.test.ts',
  'tests/integration/tools/api/issues/attachments/get/get-attachments.tool.integration.test.ts',
  'tests/integration/tools/api/issues/attachments/thumbnail/get-thumbnail.tool.integration.test.ts',
  'tests/integration/tools/api/issues/attachments/upload/upload-attachment.tool.integration.test.ts',
  'tests/integration/tools/api/issues/changelog/get-issue-changelog.tool.integration.test.ts',
  'tests/integration/tools/api/issues/create/create-issue.tool.integration.test.ts',
  'tests/integration/tools/api/issues/find/find-issues.tool.integration.test.ts',
  'tests/integration/tools/api/issues/get/get-issues.tool.integration.test.ts',
  'tests/integration/tools/api/issues/links/create/create-link.tool.integration.test.ts',
  'tests/integration/tools/api/issues/links/delete/delete-link.tool.integration.test.ts',
  'tests/integration/tools/api/issues/links/get/get-issue-links.tool.integration.test.ts',
  'tests/integration/tools/api/issues/transition/transition-issue.tool.integration.test.ts',
  'tests/integration/tools/api/issues/transitions/get-issue-transitions.tool.integration.test.ts',
  'tests/integration/tools/api/issues/update/update-issue.tool.integration.test.ts',
  'tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts',
  'tests/integration/tools/api/queues/fields/get-queue-fields.tool.integration.test.ts',
  'tests/integration/tools/api/queues/get-queue/get-queue.tool.integration.test.ts',
  'tests/integration/tools/api/queues/get/get-queues.tool.integration.test.ts',
  'tests/integration/tools/api/queues/update/update-queue.tool.integration.test.ts',
]);

/**
 * Число строк на момент снятия перечня. Барьер 1 из шапки файла: любое расхождение
 * `LEGACY_MOCK_TEST_PATHS.size` с этой константой роняет `coverage:check` — растущий
 * перечень без видимой правки этого числа невозможен.
 */
export const LEGACY_MOCK_TEST_BASELINE_COUNT = 30;

const MIN_IT_CALLS = 1;
const MIN_EXPECT_CALLS = 1;

export interface LegacyMockValidationOptions {
  readonly paths: ReadonlySet<string>;
  readonly baselineCount: number;
  /** Корень, относительно которого разрешаются пути перечня. */
  readonly packageRoot: string;
  readonly minItCalls?: number;
  readonly minExpectCalls?: number;
}

/**
 * Барьеры 1-3 из шапки файла. Параметризована (а не читает модульные константы
 * напрямую), чтобы самотест (`legacy-mock-tests.test.ts`) мог прогнать её на
 * синтетическом перечне и временных файлах, не трогая боевой `LEGACY_MOCK_TEST_PATHS`
 * и не читая реальное дерево `tests/integration/`.
 */
export function validateLegacyMockTestList(options: LegacyMockValidationOptions): void {
  const { paths, baselineCount, packageRoot } = options;
  const minItCalls = options.minItCalls ?? MIN_IT_CALLS;
  const minExpectCalls = options.minExpectCalls ?? MIN_EXPECT_CALLS;

  if (paths.size !== baselineCount) {
    throw new Error(
      `tests/coverage-exceptions/legacy-mock-tests.ts: LEGACY_MOCK_TEST_PATHS.size ` +
        `(${String(paths.size)}) не совпадает с LEGACY_MOCK_TEST_BASELINE_COUNT ` +
        `(${String(baselineCount)}) — перечень поправили, не обновив базлайн рядом ` +
        `(храповик: число обязано двигаться только вниз, вместе со строками перечня).`
    );
  }

  for (const relativePath of paths) {
    const absolutePath = join(packageRoot, relativePath);
    if (!existsSync(absolutePath)) {
      throw new Error(
        `tests/coverage-exceptions/legacy-mock-tests.ts: перечень устарел, удали строку ` +
          `"${relativePath}" — файла больше нет на диске (мигрирован на фабрику или удалён).`
      );
    }

    const content = readFileSync(absolutePath, 'utf-8');
    const itCalls = (content.match(/\bit(?:\.\w+)?\s*\(/g) ?? []).length;
    const expectCalls = (content.match(/\bexpect\s*\(/g) ?? []).length;
    if (itCalls < minItCalls || expectCalls < minExpectCalls) {
      throw new Error(
        `tests/coverage-exceptions/legacy-mock-tests.ts: "${relativePath}" в перечне, но не похож ` +
          `на реальный тест (it(: ${String(itCalls)}, expect(: ${String(expectCalls)}) — файл ` +
          `выпотрошили до заглушки. Убери строку из перечня или верни тело теста.`
      );
    }
  }
}
