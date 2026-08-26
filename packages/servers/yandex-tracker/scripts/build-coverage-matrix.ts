/**
 * Строит матрицу наблюдаемого покрытия (`tests/COVERAGE_MATRIX.md`) и, в режиме
 * `--check`, роняет процесс на дырах, которые способен закрыть уровень мока.
 *
 * Источник списка инструментов — `TOOL_CLASSES` (реестр, а не обход файлов src/tools:
 * обход не увидел бы незарегистрированный инструмент). Источник категории (папки) —
 * файловая структура `src/tools/**\/*.metadata.ts`, потому что `METADATA.category`
 * (`ToolCategory`) — семантическая группировка для `DISABLED_TOOL_GROUPS`, а не путь
 * (например, у `get_issue_types` из `src/tools/api/administration/` она
 * `ToolCategory.ISSUES`). Наличие интеграционного теста определяется по базовому
 * имени файла инструмента (дефис вместо подчёркивания) под
 * `tests/integration/tools/**` — план §B: «тест, покрывающий инструмент под другим
 * именем файла, скрипту не виден» — это слепое пятно, а не баг, и оно печатается в
 * шапке отчёта.
 *
 * Соответствие «свойство ↔ свидетельство» (план §B):
 * - С-1 истинна по построению для всех инструментов из TOOL_CLASSES (общий набор
 *   `tests/smoke`); отключение категории через `DISABLED_TOOL_GROUPS` этой колонкой
 *   не наблюдается;
 * - С-2/С-3/С-6 — три оценки по наличию интеграционного теста, не помеченного ни одним
 *   из маркеров пропуска (`describe`/`it`/`test`.`skip`/`todo`/`skipIf`/`runIf`,
 *   `xit`/`xdescribe`, `.only`): (1) файл вызывает фабрику `describeToolIntegration`
 *   ИМЕННО для этого инструмента (см. `usesFactoryForTool`) — «мок», состав кейсов
 *   принуждён типами (`invalidInput`/`errors`/`batch`/`pagination`,
 *   `tool-integration-suite.ts`); (2) файл существует и не пропущен, но фабрику не
 *   вызывает (написан до неё, на `mock-server.ts`, план §D.3, 33 существующих теста) —
 *   «мок (устаревшая оснастка)», свойство наблюдалось, но состав НЕ гарантирован —
 *   решение оркестратора по находке C-2 (третья оценка вместо ложной дихотомии
 *   «полная гарантия / дыра»); (3) файла нет или он пропущен/заглушка — «не
 *   наблюдалось», ровно то, что закрывал фиктивный `__probe/get-projects...test.ts`
 *   до фикса (C-2, CRITICAL, воспроизведено оркестратором лично);
 * - С-4 — «живьём: {отчёт}», если пара (инструмент, С-4) есть в реестре живых
 *   наблюдений (`tests/coverage-exceptions/live-observations.ts`); иначе та же
 *   трёхходовка, что у С-2/С-3/С-6, но КАЖДАЯ моковая клетка несёт пометку гипотезы:
 *   «мок (гипотеза)» на фабрике и «мок (гипотеза, устаревшая оснастка)» на перечне
 *   устаревшей оснастки. Мок не свидетельствует правильность маршрута ни для кого —
 *   он подтверждает совпадение запроса с нашим представлением об API, а не то, что API
 *   его принимает (канон §2);
 * - С-5 — «живьём: {отчёт}» по тому же реестру, «исключение: {причина}» по записи
 *   `LiveUnreachable`, иначе «не наблюдалось» (объём работ этапа 3.1);
 * - С-7 — вне области действия этапа 2.1 (план, `2.1.2_category_packages_parallel.md`
 *   P-этап не назначен), клетка «не наблюдалось» для всех — объём работ этапа P2.
 *
 * `--check` сверяет дыры с замороженным набором пар
 * (`tests/coverage-exceptions/coverage-gate-baseline.ts`) в обе стороны: новая дыра —
 * отказ, закрытая и не убранная из набора — тоже отказ.
 *
 * `--check` дополнительно (M-6, M-9): сравнивает сгенерированный markdown с уже
 * закоммиченным `tests/COVERAGE_MATRIX.md` и падает на расхождении, НЕ переписывая
 * файл (иначе кэш-хит Turborepo с `outputs: []` у задачи давал грязное git-дерево в
 * CI, а устаревшую матрицу можно было закоммитить незаметно); и падает на «устаревшей»
 * записи реестра исключений — той, у чьего инструмента уже есть рабочий тест на то же
 * свойство (иначе реестр копит мусор навсегда), и на устаревшей записи `LiveUnreachable`
 * — той, чья клетка стала «живьём».
 *
 * Слепые пятна статических проверок (честно, а не подразумевается):
 * - тест, покрывающий инструмент под другим именем файла или списком внутри одного
 *   файла, скрипту не виден (ключ сопоставления — базовое имя файла теста);
 * - тест, передающий `describeToolIntegration({ tool: ... })` не через
 *   `{BASE_NAME}_TOOL_METADATA.name` и не буквальным полным именем инструмента, скрипту
 *   не виден (получит «мок (устаревшая оснастка)», а не «мок») — эвристика проверяет
 *   конвенцию именования, а не типы;
 * - многоступенчатые «особенные» тесты (`download_attachment`, `get_thumbnail`,
 *   `transition_issue` — план §A), написанные напрямую на
 *   `ApiExpectationSet` без фабрики, тоже получают «мок (устаревшая оснастка)», а не
 *   полную гарантию «мок» — план явно выводит их из шаблона, но не из требования иметь
 *   машинно проверяемое доказательство состава;
 * - поиск маркеров пропуска убирает `//`- и `/* *\/`-комментарии наивной регуляркой —
 *   строковый литерал вида `'http://x'` теоретически может пострадать;
 * - осмысленность ожиданий внутри теста (не только их наличие) типами и статическим
 *   анализом не проверяется — только ревью.
 */

import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeToolSchemaFingerprint } from '@fractalizer/mcp-core';
import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';
import { MCP_TOOL_PREFIX } from '../src/constants.js';
import { loadCoverageExceptions, knownToolBaseNames } from '../tests/coverage-exceptions/index.js';
import {
  collectCoverageGateViolations,
  formatCoverageGateFailures,
  assertBaselineOriginIntact,
  COVERAGE_GATE_BASELINE,
  GATED_PROPERTIES,
} from '../tests/coverage-exceptions/coverage-gate-baseline.js';
import {
  LIVE_OBSERVATIONS,
  LIVE_UNREACHABLE,
  RETIRED_LIVE_OBSERVATIONS,
  validateLiveRegistry,
  formatStaleLiveRegistryFailures,
  collectFingerprintMismatches,
  formatFingerprintMismatchFailure,
  retiredLiveKeys,
} from '../tests/coverage-exceptions/live-observations.js';
import {
  LEGACY_MOCK_TEST_PATHS,
  LEGACY_MOCK_TEST_BASELINE_COUNT,
  validateLegacyMockTestList,
} from '../tests/coverage-exceptions/legacy-mock-tests.js';
import type {
  CoverageException,
  CoverageProperty,
  LiveObservableProperty,
  LiveObservation,
} from '../tests/coverage-exceptions/types.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(SCRIPT_DIR, '..');
const TOOLS_SRC_DIR = join(PACKAGE_ROOT, 'src', 'tools');
const INTEGRATION_TESTS_DIR = join(PACKAGE_ROOT, 'tests', 'integration', 'tools');
const OUTPUT_PATH = join(PACKAGE_ROOT, 'tests', 'COVERAGE_MATRIX.md');

/**
 * `мок (устаревшая оснастка)` — третья оценка (решение оркестратора по находке C-2):
 * интеграционный тест существует и не пропущен, но не вызывает фабрику
 * `describeToolIntegration` — написан до неё, на `mock-server.ts` (план §D.3, 33
 * существующих теста). Свойство наблюдалось, но обязательный состав кейсов НЕ
 * гарантирован типами — в отличие от `мок`, где состав принуждён `tool-integration-suite.ts`.
 * `coverage:check` эту клетку дырой не считает (свидетельство есть), но и не путает с
 * `мок` (свидетельство неполное) — см. `collectLegacyMockToolCount`.
 */
type Cell =
  | { readonly kind: 'unit' | 'мок' | 'живьём'; readonly ref: string }
  | {
      readonly kind:
        | 'мок (гипотеза)'
        | 'мок (устаревшая оснастка)'
        | 'мок (гипотеза, устаревшая оснастка)';
      readonly ref: string;
    }
  | { readonly kind: 'не наблюдалось' }
  | { readonly kind: 'исключение' | 'неприменимо'; readonly reason: string };

function cellText(cell: Cell): string {
  switch (cell.kind) {
    case 'unit':
    case 'мок':
    case 'живьём':
    case 'мок (гипотеза)':
    case 'мок (устаревшая оснастка)':
    case 'мок (гипотеза, устаревшая оснастка)':
      return `${cell.kind}: ${cell.ref}`;
    case 'исключение':
    case 'неприменимо':
      return `${cell.kind}: ${cell.reason}`;
    case 'не наблюдалось':
      return 'не наблюдалось';
  }
}

interface ToolRow {
  readonly baseName: string;
  readonly fullName: string;
  readonly categoryFolder: string;
  readonly readOnly: boolean;
  readonly destructive: boolean;
}

/** Извлекает базовое имя инструмента и категорию (папку) из `*.metadata.ts` файлов. */
function buildCategoryIndex(): Map<string, string> {
  const index = new Map<string, string>();
  const nameRegex = /buildToolName\(\s*'([a-z0-9_]+)'/;

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith('.metadata.ts')) continue;
      const content = readFileSync(fullPath, 'utf-8');
      const match = nameRegex.exec(content);
      if (!match) continue;
      const baseName = match[1] as string;
      const relativeDir = relative(TOOLS_SRC_DIR, dirname(fullPath)).split(sep).join('/');
      // '' — файл лежит прямо в src/tools/ (например, ping.metadata.ts).
      index.set(baseName, relativeDir === '' ? '(root)' : relativeDir);
    }
  };

  walk(TOOLS_SRC_DIR);
  return index;
}

/** Все интеграционные тестовые файлы под `tests/integration/tools/`, рекурсивно. */
function listIntegrationTestFiles(): string[] {
  if (!existsSync(INTEGRATION_TESTS_DIR)) return [];
  return readdirSync(INTEGRATION_TESTS_DIR, { recursive: true })
    .map(String)
    .filter((entry) => entry.endsWith('.tool.integration.test.ts'))
    .map((entry) => join(INTEGRATION_TESTS_DIR, entry));
}

/** Фабрика (нет): `describeToolIntegration` (полный контракт) или `describeNoHttpToolIntegration` (M-4, для инструментов без единого HTTP-запроса — ping/demo/get_issue_urls). */
type FactoryKind = 'full' | 'no-http' | null;

interface ToolTestFile {
  readonly path: string;
  readonly hasSkip: boolean;
  readonly factoryKind: FactoryKind;
}

/**
 * Убирает `//` и `/* *\/` комментарии перед поиском skip-маркеров (M-7, найдено
 * ревью пакета): подстрока `describe.skip(` внутри комментария раньше ошибочно гасила
 * всю строку матрицы. Наивно — строковый литерал вида `'http://x'` теоретически может
 * пострадать; это компромисс эвристики, а не полноценный парсер TS, и печатается как
 * слепое пятно в шапке отчёта.
 */
function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

/**
 * Маркеры «тест не выполняется» (M-7, найдено ревью пакета): исходная регулярка ловила
 * только `describe.skip`/`it.skip`. Добавлены `test.skip`, `it.todo`/`describe.todo`,
 * `it.skipIf`/`describe.runIf`, Jest-алиасы `xit`/`xdescribe`. `it.only`/`describe.only`
 * переводят ОСТАЛЬНЫЕ тесты файла в пропущенные, поэтому трактуются так же
 * консервативно, как прямой skip, — файл с `.only` целиком помечается подозрительным.
 */
const SKIP_MARKER =
  /\b(describe|it|test)\.(skip|todo|skipIf|runIf|only)\s*\(|\bx(it|describe)\s*\(/;

function hasSkipMarker(content: string): boolean {
  return SKIP_MARKER.test(stripComments(content));
}

/** Имя фабрики → как классифицируется вызов, если поле `tool:` внутри его аргументов совпало с инструментом. */
const FACTORY_NAMES: ReadonlyArray<{ readonly name: string; readonly kind: 'full' | 'no-http' }> = [
  { name: 'describeToolIntegration', kind: 'full' },
  { name: 'describeNoHttpToolIntegration', kind: 'no-http' },
];

/**
 * Достаёт содержимое круглых скобок каждого вызова `functionName(...)`, уважая
 * вложенные скобки и строковые/шаблонные литералы (наивно — не полноценный парсер
 * TS, но не путает `(` внутри `'...'` с границей вызова). Нужно для F3 (найдено
 * ревью оркестратора): раньше факт импорта фабрики и наличие поля `tool: ...` где
 * угодно в файле проверялись НЕЗАВИСИМО, поэтому файл, импортирующий обе формы
 * фабрики и вызывающий только `describeNoHttpToolIntegration`, получал полный грейд
 * `мок` по одной лишь текстовой близости поля `tool:` к другому вызову.
 */
/**
 * Индекс закрывающей `)`, парной открывающей в `openParenIndex`, с учётом строковых и
 * шаблонных литералов (`(` внутри `'...'` не считается границей вызова). `null`, если
 * скобки не сбалансированы до конца файла.
 */
function findMatchingParen(content: string, openParenIndex: number): number | null {
  let depth = 0;
  let inString: '"' | "'" | '`' | null = null;
  for (let i = openParenIndex; i < content.length; i++) {
    const ch = content[i];
    if (inString) {
      if (ch === '\\') {
        i++;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return null;
}

function extractBalancedCalls(content: string, functionName: string): string[] {
  const results: string[] = [];
  const callStart = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
  let match: RegExpExecArray | null;
  while ((match = callStart.exec(content)) !== null) {
    const openParenIndex = match.index + match[0].length - 1;
    const closeParenIndex = findMatchingParen(content, openParenIndex);
    if (closeParenIndex !== null) {
      results.push(content.slice(openParenIndex + 1, closeParenIndex));
    }
  }
  return results;
}

function matchesToolField(slice: string, baseName: string): boolean {
  const metadataConstant = `${baseName.toUpperCase()}_TOOL_METADATA`;
  const literalToolName = `${MCP_TOOL_PREFIX}${baseName}`;
  const toolFieldPattern = new RegExp(
    `\\btool:\\s*(?:${metadataConstant}\\.name|['"]${literalToolName}['"])`
  );
  return toolFieldPattern.test(slice);
}

/**
 * Требует реального использования фабрики ИМЕННО для этого инструмента (C-2,
 * CRITICAL, воспроизведено оркестратором лично: файл
 * `tests/integration/tools/api/__probe/get-projects.tool.integration.test.ts` из
 * одной строки-комментария закрывал все клетки get_projects, потому что скрипт
 * проверял только `.skip`, не факт вызова фабрики). Соответствие «имя файла теста ↔
 * константа метаданных» — конвенция `{BASE_NAME}_TOOL_METADATA`, которой следуют все
 * `*.metadata.ts` (пример: `create-board.metadata.ts` → `CREATE_BOARD_TOOL_METADATA`).
 *
 * Две формы фабрики (F1, подтверждено оркестратором): `describeToolIntegration`
 * (полный контракт) и `describeNoHttpToolIntegration` (M-4, инструменты без единого
 * HTTP-запроса — ping/demo/get_issue_urls). Поле `tool:` сопоставляется С ВЫЗОВОМ
 * конкретной фабрики через `extractBalancedCalls`, а не ищется по всему файлу
 * независимо от импорта (F3, подтверждено оркестратором): иначе файл, импортирующий
 * обе формы и вызывающий только NoHttp для инструмента X, получал бы полный `full`
 * по текстовой близости чужого поля `tool:`.
 *
 * Слепое пятно: тест, передающий имя инструмента иначе (не через
 * `{...}_TOOL_METADATA.name` и не буквальным полным именем), скрипту не виден —
 * печатается в шапке отчёта. Многоступенчатые «особенные» тесты (`download_attachment`,
 * `get_thumbnail`, `transition_issue` — план §A) пишутся НЕ через
 * эту фабрику и этой проверкой намеренно не засчитываются: план явно выводит их из
 * шаблона, но не из требования иметь машинно проверяемое доказательство состава.
 */
function detectFactoryUsage(content: string, baseName: string): FactoryKind {
  for (const { name, kind } of FACTORY_NAMES) {
    const importsFactory = new RegExp(
      `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"][^'"]*tool-integration-suite(?:\\.js)?['"]`
    ).test(content);
    if (!importsFactory) continue;

    for (const slice of extractBalancedCalls(content, name)) {
      if (matchesToolField(slice, baseName)) return kind;
    }
  }
  return null;
}

/**
 * Индекс «базовое имя файла (без .tool.integration.test.ts)» → информация о файле.
 * Ключ — единственный источник соответствия «файл ↔ инструмент», поэтому два файла с
 * одинаковым базовым именем в разных категориях роняют сборку явной ошибкой (M-8,
 * найдено ревью пакета), а не тихо перезаписывают друг друга — иначе клетка матрицы
 * сослалась бы на случайный из двух тестов.
 */
function buildTestFileIndex(): Map<string, ToolTestFile> {
  const index = new Map<string, ToolTestFile>();
  for (const filePath of listIntegrationTestFiles()) {
    const fileName = filePath.split(sep).pop() as string;
    const baseFileName = fileName.replace(/\.tool\.integration\.test\.ts$/, '');
    const relativePath = relative(PACKAGE_ROOT, filePath);

    const existing = index.get(baseFileName);
    if (existing) {
      throw new Error(
        `Два интеграционных тестовых файла дают одно и то же базовое имя "${baseFileName}": ` +
          `"${existing.path}" и "${relativePath}" — клетка матрицы сослалась бы на случайный ` +
          `из них. Переименуй один из файлов так, чтобы базовые имена не совпадали.`
      );
    }

    const content = readFileSync(filePath, 'utf-8');
    // Имя файла (дефис вместо подчёркивания) уже кодирует, для какого инструмента
    // написан тест — тот же ключ, что использует toolBaseNameToTestFileName() при
    // поиске строки матрицы, поэтому factoryKind считается здесь, а не при чтении
    // строки инструмента.
    const impliedBaseName = baseFileName.replace(/-/g, '_');
    index.set(baseFileName, {
      path: relativePath,
      hasSkip: hasSkipMarker(content),
      factoryKind: detectFactoryUsage(content, impliedBaseName),
    });
  }
  return index;
}

/**
 * Храповик перечня `LEGACY_MOCK_TEST_PATHS` (найдено ревью оркестратора, F4/F5):
 * барьеры 1-3 (размер перечня, файл существует, файл похож на реальный тест) живут в
 * `validateLegacyMockTestList` — параметризованы и покрыты собственным самотестом
 * (`legacy-mock-tests.test.ts`). Барьер 4 — путь из перечня, чей файл уже вызывает
 * фабрику для этого инструмента (F5: строка пережила миграцию, а `existsSync`-проверка
 * этого не ловит), — требует `testFileIndex`, поэтому живёт здесь, а не в самом файле
 * перечня (у того нет и не должно быть знания о regex-детекторе фабрики).
 */
function validateLegacyMockPathsNotMigrated(testFileIndex: Map<string, ToolTestFile>): void {
  for (const testFile of testFileIndex.values()) {
    if (LEGACY_MOCK_TEST_PATHS.has(testFile.path) && testFile.factoryKind !== null) {
      throw new Error(
        `tests/coverage-exceptions/legacy-mock-tests.ts: перечень устарел, удали строку ` +
          `"${testFile.path}" — файл уже вызывает фабрику (${testFile.factoryKind === 'full' ? 'describeToolIntegration' : 'describeNoHttpToolIntegration'}).`
      );
    }
  }
}

function toolBaseNameToTestFileName(baseName: string): string {
  return baseName.replace(/_/g, '-');
}

/**
 * Отпечаток схемы каждого зарегистрированного инструмента — на нём держится
 * привязка записи `LiveObservation` к состоянию кода.
 *
 * Нечитаемая схема даёт `undefined`, а не бросок: инструмент без записи в реестре
 * прогон ронять не должен, а инструмент с записью получит расхождение —
 * `collectFingerprintMismatches` считает `undefined` расхождением.
 */
function buildFingerprintIndex(): {
  readonly fingerprints: Map<string, string>;
  readonly readErrors: Map<string, string>;
} {
  const fingerprints = new Map<string, string>();
  const readErrors = new Map<string, string>();
  for (const ToolClass of TOOL_CLASSES) {
    const fullName = ToolClass.METADATA.name;
    const baseName = fullName.startsWith(MCP_TOOL_PREFIX)
      ? fullName.slice(MCP_TOOL_PREFIX.length)
      : fullName;
    try {
      fingerprints.set(baseName, computeToolSchemaFingerprint(ToolClass));
    } catch (error: unknown) {
      // Причина сохраняется, а не теряется: у инструмента С записью реестра она
      // попадёт в текст расхождения, у инструмента БЕЗ записи — останется единственным
      // следом того, что схему прочитать не удалось.
      readErrors.set(baseName, error instanceof Error ? error.message : String(error));
    }
  }
  return { fingerprints, readErrors };
}

/**
 * Пере-штамповка обязана быть видна в артефакте, а не только в исходнике реестра:
 * иначе самый дешёвый выход из расхождения отпечатка (правка 12 hex-символов) не
 * оставляет следа ни в диффе матрицы, ни у читателя клетки.
 */
function liveCellRef(observation: LiveObservation): string {
  return observation.fingerprintRestamp === undefined
    ? observation.report
    : `${observation.report} (отпечаток пере-штампован после ${observation.fingerprintRestamp.afterCommit})`;
}

function findLiveObservation(tool: string, property: LiveObservableProperty) {
  return LIVE_OBSERVATIONS.find(
    (observation) => observation.tool === tool && observation.property === property
  );
}

function findLiveUnreachable(tool: string, property: LiveObservableProperty) {
  return LIVE_UNREACHABLE.find((record) => record.tool === tool && record.property === property);
}

function findExceptionsFor(
  exceptions: readonly CoverageException[],
  tool: string,
  property: CoverageProperty
): CoverageException | undefined {
  return exceptions.find((exception) => exception.tool === tool && exception.property === property);
}

interface RowResult {
  readonly row: ToolRow;
  readonly cells: Record<CoverageProperty, Cell>;
}

function computeRow(
  row: ToolRow,
  testFileIndex: Map<string, ToolTestFile>,
  exceptions: readonly CoverageException[]
): RowResult {
  const testFileName = toolBaseNameToTestFileName(row.baseName);
  const testFile = testFileIndex.get(testFileName);
  const hasFullFactoryTest =
    testFile !== undefined && !testFile.hasSkip && testFile.factoryKind === 'full';
  // M-4/F1 (подтверждено оркестратором): `describeNoHttpToolIntegration` — вторая
  // легитимная форма фабрики, для инструментов, физически не делающих HTTP-запросов
  // (ping, demo, get_issue_urls). errors/batch/pagination там не наблюдались не
  // потому, что тест их упустил, а потому, что их не существует у этого класса
  // инструментов по построению — засчитывать это как `мок` на С-4/С-6 значило бы
  // переобещать, а как дыру — заведомо ложно требовать несуществующего свидетельства.
  const hasNoHttpFactoryTest =
    testFile !== undefined && !testFile.hasSkip && testFile.factoryKind === 'no-http';
  // Тест существует, не пропущен, не вызывает НИ ОДНУ форму фабрики И числится в
  // закрытом перечне `LEGACY_MOCK_TEST_PATHS` (храповик, найдено ревью оркестратора:
  // без привязки к перечню файл-заглушка из одной строки-комментария повторно обходил
  // C-2 — теперь через новую клетку вместо «нет теста»). Любой другой файл вне
  // перечня, не вызывающий фабрику, — дыра `не наблюдалось`, как было до введения
  // третьей оценки.
  const hasLegacyMockTest =
    testFile !== undefined &&
    !testFile.hasSkip &&
    testFile.factoryKind === null &&
    LEGACY_MOCK_TEST_PATHS.has(testFile.path);

  const NOT_APPLICABLE_NO_HTTP: Cell = {
    kind: 'неприменимо',
    reason: 'инструмент не делает HTTP-запросов (M-4, describeNoHttpToolIntegration)',
  };

  /**
   * `noHttpGivesFullCredit` различает С-2/С-3 (invalidInput/happy path — применимы и
   * без HTTP) от С-6 (errors/batch/pagination — требуют HTTP по построению): для
   * первых двух `describeNoHttpToolIntegration` даёт полноценный `мок`, для
   * последнего — `неприменимо`, никогда не дыру.
   */
  const mockObservedCell = (property: CoverageProperty, noHttpGivesFullCredit: boolean): Cell => {
    if (hasFullFactoryTest) {
      return { kind: 'мок', ref: (testFile as ToolTestFile).path };
    }
    if (hasNoHttpFactoryTest) {
      return noHttpGivesFullCredit
        ? { kind: 'мок', ref: (testFile as ToolTestFile).path }
        : NOT_APPLICABLE_NO_HTTP;
    }
    if (hasLegacyMockTest) {
      return { kind: 'мок (устаревшая оснастка)', ref: (testFile as ToolTestFile).path };
    }
    const exception = findExceptionsFor(exceptions, row.baseName, property);
    if (exception) {
      return { kind: 'исключение', reason: exception.reason };
    }
    return { kind: 'не наблюдалось' };
  };

  // Мок не свидетельствует правильность маршрута НИ ДЛЯ КОГО (решение пользователя,
  // 2026-08-26): он подтверждает совпадение запроса с нашим представлением об API, а не
  // то, что API его принимает. Прежнее деление «инструментам исключённых категорий —
  // гипотеза, остальным — полноценный мок» само было выведено, а не подтверждено;
  // цена перехода измерена и составила один инструмент.
  //
  // `LiveUnreachable` на С-4 клетку `исключение` НЕ производит и от «записи нет» ничем
  // не отличается: `collectCheckFailures` считает дырой только `не наблюдалось`, то
  // есть любое `исключение` снимает дыру гейта, а `collectStaleExceptions` обходит
  // только `CoverageException` — запись «недостижимо» не устарела бы никогда. На С-4
  // она остаётся объяснением, а не пропуском гейта.
  const c4: Cell = (() => {
    const observation = findLiveObservation(row.baseName, 'С-4');
    if (observation) {
      return { kind: 'живьём', ref: liveCellRef(observation) };
    }
    if (hasFullFactoryTest) {
      return { kind: 'мок (гипотеза)', ref: (testFile as ToolTestFile).path };
    }
    if (hasNoHttpFactoryTest) {
      // Версия API не объявляется — нет запроса, который бы её нёс.
      return NOT_APPLICABLE_NO_HTTP;
    }
    if (hasLegacyMockTest) {
      // Обе оговорки ортогональны и обязаны стоять вместе: «маршрут не подтверждён»
      // (гипотеза) и «состав кейсов не гарантирован» (устаревшая оснастка). Прежний
      // порядок проверок терял первую — `hasFullFactoryTest`/`hasLegacyMockTest`
      // стояли раньше признака исключения.
      return { kind: 'мок (гипотеза, устаревшая оснастка)', ref: (testFile as ToolTestFile).path };
    }
    const exception = findExceptionsFor(exceptions, row.baseName, 'С-4');
    return exception
      ? { kind: 'исключение', reason: exception.reason }
      : { kind: 'не наблюдалось' };
  })();

  // С-5 в гейт не входит вовсе (`GATED_PROPERTIES`), поэтому `исключение`
  // здесь безвредно и остаётся честным именем недостижимости.
  const c5: Cell = (() => {
    const observation = findLiveObservation(row.baseName, 'С-5');
    if (observation) {
      return { kind: 'живьём', ref: liveCellRef(observation) };
    }
    const unreachable = findLiveUnreachable(row.baseName, 'С-5');
    return unreachable
      ? { kind: 'исключение', reason: unreachable.reason }
      : { kind: 'не наблюдалось' };
  })();

  return {
    row,
    cells: {
      'С-1': {
        kind: 'unit',
        ref: 'tests/smoke (общий набор, definition-generation.smoke.test.ts)',
      },
      'С-2': mockObservedCell('С-2', true),
      'С-3': mockObservedCell('С-3', true),
      'С-4': c4,
      'С-5': c5,
      'С-6': mockObservedCell('С-6', false),
      'С-7': { kind: 'не наблюдалось' },
    },
  };
}

interface ToolMetadataLike {
  readonly name: string;
  readonly annotations?: { readonly readOnlyHint?: boolean; readonly destructiveHint?: boolean };
}

/**
 * `categoryFolder` неразрешим, только когда `buildCategoryIndex()` не нашла
 * `buildToolName('{baseName}', ...)` ни в одном `*.metadata.ts` — то есть
 * зарегистрированный в `TOOL_CLASSES` инструмент и его файл метаданных разошлись.
 * Раньше это тихо превращалось в `categoryFolder: '?'`, из-за чего клетки С-4/С-5
 * молча меняли значение (M-8, найдено ревью пакета): матрица врала бы именно в
 * клетке, ради честности которой заведён этот тип клетки. С переходом на потульный
 * реестр живых наблюдений категория перестала влиять на клетки и осталась колонкой
 * навигации и ключом сортировки — но неразрешимая категория по-прежнему означает
 * разошедшиеся `TOOL_CLASSES` и `*.metadata.ts`, и это явная ошибка сборки.
 */
function buildToolRows(categoryIndex: Map<string, string>): ToolRow[] {
  return TOOL_CLASSES.map((ToolClass) => {
    const metadata = (ToolClass as unknown as { METADATA: ToolMetadataLike }).METADATA;
    const fullName = metadata.name;
    const baseName = fullName.startsWith(MCP_TOOL_PREFIX)
      ? fullName.slice(MCP_TOOL_PREFIX.length)
      : fullName;
    const categoryFolder = categoryIndex.get(baseName);
    if (categoryFolder === undefined) {
      throw new Error(
        `Инструмент "${baseName}" (${fullName}) зарегистрирован в TOOL_CLASSES, но его ` +
          `категория не найдена ни в одном src/tools/**/*.metadata.ts — buildToolName() там ` +
          `обязан использовать литерал '${baseName}', совпадающий с базовым именем.`
      );
    }
    return {
      baseName,
      fullName,
      categoryFolder,
      readOnly: metadata.annotations?.readOnlyHint === true,
      destructive: metadata.annotations?.destructiveHint === true,
    };
  }).sort(
    (a, b) =>
      a.categoryFolder.localeCompare(b.categoryFolder) || a.baseName.localeCompare(b.baseName)
  );
}

function renderHeader(toolCount: number): string {
  return `# Матрица покрытия инструментов Трекера

Сгенерировано \`npm run coverage:matrix\` (\`scripts/build-coverage-matrix.ts\`). Не редактируется
вручную — расхождение с фактом чинится перегенерацией, а не правкой файла.

**Клетка называет уровень наблюдения, а не факт покрытия** (план
\`2.1.1_matrix_and_harness_sequential.md\` §B):

| Значение | Смысл |
|---|---|
| \`unit\`/\`мок\` | свойство наблюдалось на этом уровне, состав кейсов принуждён типами фабрики \`describeToolIntegration\` (план §A) — ссылка на тест |
| \`живьём\` | свойство наблюдалось в живом прогоне против боевого API — ссылка на ОТЧЁТ прогона (\`tests/live-runs/\`), не на тест. Ни фабрики, ни машинно принуждённого состава кейсов здесь нет вовсе: состав проб определял автор прогона, а критерий записи (эффект прочитан обратно) держится на ревью реестра \`tests/coverage-exceptions/live-observations.ts\`. Наблюдение единично: повторяемость не гарантирована, а привязка к коду держится на отпечатке схемы ПАРАМЕТРОВ — ни маршрут, ни форму ОТВЕТА он не видит. Пометка «отпечаток пере-штампован после \`{коммит}\`» означает, что схему правили после прогона, а запись сохранили с обоснованием (\`fingerprintRestamp\`) |
| \`мок (гипотеза)\` | С-4 наблюдался только на моке: состав кейсов принуждён фабрикой, но маршрут не подтверждён — мок свидетельствует совпадение запроса с нашим представлением об API, а не то, что API его принимает (канон §2) |
| \`мок (гипотеза, устаревшая оснастка)\` | обе оговорки сразу: маршрут не подтверждён И состав кейсов не гарантирован |
| \`мок (устаревшая оснастка)\` | интеграционный тест существует и не пропущен, но написан ДО фабрики, на \`mock-server.ts\` (план §D.3) — свойство наблюдалось, но обязательный состав кейсов НЕ гарантирован: он на совести автора теста, а не типов |
| \`неприменимо: причина\` | свойство физически недостижимо для этого класса инструментов (С-4/С-6 у инструмента без HTTP-запросов — \`describeNoHttpToolIntegration\`, M-4) — не дыра, но и не \`мок\`: наблюдать нечего по построению |
| \`не наблюдалось\` | ни один уровень свойства не проверял |
| \`исключение: причина\` | сознательно не проверяется, реестр — \`tests/coverage-exceptions/\` |

**\`мок\` vs \`мок (устаревшая оснастка)\` — это не синонимы:** у \`мок\` состав
обязательных кейсов (\`invalidInput\`/\`errors\`/\`batch\`/\`pagination\`) принуждён
типами фабрики — тест, не объявивший их, не компилируется. У \`мок (устаревшая
оснастка)\` состав ничем не принуждён: тест написан до фабрики напрямую на
\`mock-server.ts\`, и что именно он проверяет — известно только по факту чтения
файла. \`coverage:check\` не считает вторую клетку дырой (свидетельство есть), но и не
путает её с первой — иначе через полгода различие потеряется.

**Оговорки и слепые пятна:**

- С-1 истинна по построению для всех ${String(toolCount)} инструментов из \`TOOL_CLASSES\` (общий
  набор \`tests/smoke\`); отключение категории через \`DISABLED_TOOL_GROUPS\` этой колонкой НЕ
  наблюдается.
- Ключ сопоставления «инструмент ↔ тест» — базовое имя файла инструмента
  (\`{имя}.tool.integration.test.ts\` под \`tests/integration/tools/\`). Тест, покрывающий
  инструмент под другим именем файла или списком внутри одного файла, скрипту НЕ виден.
  Два файла с одинаковым базовым именем в разных категориях роняют сборку явной
  ошибкой, а не тихо перезаписывают друг друга.
- Клетка получает \`мок\` (полная гарантия), только если файл теста реально вызывает
  \`describeToolIntegration({ tool: ... })\` (или, для инструментов без единого
  HTTP-запроса, \`describeNoHttpToolIntegration({ tool: ... })\` — M-4, С-4/С-6 тогда
  \`неприменимо\`, а не \`мок\`) для ИМЕННО этого инструмента: поле \`tool:\` обязано
  найтись ВНУТРИ аргументов конкретного вызова (не где-то ещё в файле) и совпасть по
  конвенции именования \`{BASE_NAME}_TOOL_METADATA\` — файл, импортирующий обе формы
  фабрики, но вызывающий только одну для этого инструмента, не получает грейд другой.
  Файл существует, не пропущен, но ни одну форму не вызывает — \`мок (устаревшая
  оснастка)\`; файл-заглушка без реального теста (или пропущенный) клетку НЕ закрывает
  вовсе. Многоступенчатые «особенные» тесты (план §A: \`download_attachment\`,
  \`get_thumbnail\`, \`transition_issue\`), написанные без
  фабрики, тоже получают \`мок (устаревшая оснастка)\`, а не полную гарантию.
- Маркеры пропуска: \`describe\`/\`it\`/\`test\`.\`skip\`/\`todo\`/\`skipIf\`/\`runIf\`,
  \`xit\`/\`xdescribe\`, \`.only\` — любой из них трактует файл теста как отсутствие
  теста. Поиск идёт по содержимому файла без \`//\`/\`/* *\/\`-комментариев наивной
  регуляркой — строковый литерал вида \`'http://x'\` теоретически может пострадать.
- Осмысленность ожиданий внутри теста (не только их наличие) типами не проверяется —
  только ревью.
- \`--check\` дополнительно падает на расхождении с закоммиченным файлом (не переписывая
  его), на «устаревшей» записи реестра исключений — той, у чьего инструмента уже есть
  рабочий тест на то же свойство, — и на рассинхроне перечня
  \`tests/coverage-exceptions/legacy-mock-tests.ts\`: размер перечня разошёлся с
  зафиксированным базлайном, путь ссылается на несуществующий файл, файл не похож на
  реальный тест (меньше минимума вызовов \`it(\`/\`expect(\`), или файл из перечня уже
  вызывает фабрику для своего инструмента (перечень — храповик: может только
  сокращаться, новый тест — всегда на фабрике).
- **Дыры сверяются с замороженным НАБОРОМ пар**, а не с числом
  (\`tests/coverage-exceptions/coverage-gate-baseline.ts\`): пара вне набора, ставшая
  дырой, роняет \`--check\` с её именем; пара из набора, переставшая быть дырой, роняет
  тоже — с требованием убрать строку, иначе храповик разрешал бы вернуть закрытую дыру
  навсегда. Скаляр этого не отличает: закрытие одной клетки с одновременной потерей
  теста у другого инструмента оставило бы прежнее число и зелёный гейт.
  **Рост набора тоже роняет:** каждая строка базлайна сверяется с замороженным снимком
  \`COVERAGE_GATE_BASELINE_ORIGIN\`, и ключ вне снимка законен только при записи
  \`RetiredLiveObservation\` на ту же пару. Без этой сверки запрет «дописывать строку
  нельзя» держался бы на комментарии: дописанная пара выглядит унаследованной.
  Строка нужна только для свойств гейта (${GATED_PROPERTIES.join('/')}) — снятие
  наблюдения по С-5 клетки гейта не создаёт, и строка \`tool[С-5]\` сразу становится
  нарушением «перестала быть дырой».
- **Живое наблюдение потульно, а не категорийно.** Клетки С-4/С-5 читают реестр
  \`tests/coverage-exceptions/live-observations.ts\`: пара (инструмент, свойство) с
  записью \`LiveObservation\` даёт \`живьём: {отчёт}\` (отчёты — \`tests/live-runs/\`),
  запись \`LiveUnreachable\` даёт \`исключение: {причина}\` на С-5 и НЕ даёт исключения
  на С-4 (иначе она снимала бы дыру гейта и не устаревала бы никогда) — на С-4 её
  причина печатается разделом «С-4: живой прогон недостижим» под таблицей, чтобы
  \`не наблюдалось\` не читалось как «причина неизвестна». Прежний список
  из шести папок \`src/tools/api/*\` объявлял «живьём не наблюдается никогда» сразу 36
  инструментам, и посылка устарела молча: допуск по владению прогоном
  (\`tests/TESTING_STRATEGY.md\` §1) открыл доски, спринты, фильтры и очереди.
  \`tests/TESTING_STRATEGY.md\` §1 остаётся источником ПРИЧИНЫ, реестр — источником
  СПИСКА.
- **Запись живого наблюдения привязана к коду отпечатком схемы параметров**
  (\`schemaFingerprint\`, \`computeToolSchemaFingerprint\` из \`@fractalizer/mcp-core\`):
  правка схемы инструмента роняет \`coverage:check\` с требованием перепроверить
  инструмент живьём, пере-штамповать запись с обоснованием (\`fingerprintRestamp\`) либо
  снять наблюдение записью \`RetiredLiveObservation\` — третий выход законный и от
  «потеряли тест» гейтом отличается. Чего отпечаток НЕ ловит — двух вещей: **маршрут**
  живёт в операции API (смена URL, метода или формы тела запроса клетку \`живьём\` не
  гасит) и **форма ответа** (\`outputSchema\`, DTO разбора) в отпечаток не входит вовсе,
  хотя правдивость эффекта С-5 читается именно через ответ — прогон 26 августа вскрыл
  ровно этот класс (\`PATCH .../permissions\` отвечает \`{self, version}\` при
  объявленном массиве).
- **С-4 на моке — всегда гипотеза.** Ни у одного инструмента мок не свидетельствует
  правильность маршрута; полноценный \`мок\` в этой колонке не появляется вовсе.
- С-5 не наблюдается на моке никогда: либо \`живьём\` по реестру, либо \`исключение\`
  по записи \`LiveUnreachable\`, либо «не наблюдалось» (объём работ этапа 3.1).
- С-7 вне области действия этапа 2.1 — «не наблюдалось» для всех строк (объём работ
  этапа P2).
- **С-6 в этой колонке — не весь С-6.** Канон
  (\`packages/servers/TESTING_STRATEGY.md\`) определяет С-6 как пагинацию, batch с
  частичными отказами, коды ошибок, лимиты, юникод, таймауты и ретраи. Фабрика
  наблюдает из этого списка коды ошибок (403/404), batch и пагинацию там, где они
  применимы. **Юникод и лимиты не проверяет ни один вход, а ретрай эта оснастка не
  может наблюдать по построению** (упорядоченная очередь ожиданий несовместима с
  повтором запроса — слепое пятно M-1, \`api-expectation.ts\`). Поэтому «дыр по С-6
  нет» означает «наблюдены наблюдаемые здесь части С-6», а не «свойство закрыто»
  (найдено ревью волны 2.1.2, claude-07). Расщепление С-6 на подсвойства — решение
  перед второй волной, а не правка этой шапки.

`;
}

function renderTable(results: readonly RowResult[]): string {
  const properties: CoverageProperty[] = ['С-1', 'С-2', 'С-3', 'С-4', 'С-5', 'С-6', 'С-7'];
  const header = `| Инструмент | Категория | W | D | ${properties.join(' | ')} |\n`;
  const separator = `|---|---|:--:|:--:|${properties.map(() => '---').join('|')}|\n`;
  const rows = results
    .map((result) => {
      const { row, cells } = result;
      const cellValues = properties.map((property) => cellText(cells[property]));
      return `| \`${row.baseName}\` | ${row.categoryFolder} | ${row.readOnly ? '' : 'да'} | ${row.destructive ? 'да' : ''} | ${cellValues.join(' | ')} |`;
    })
    .join('\n');
  return header + separator + rows + '\n';
}

/**
 * Раздел под таблицей: причины недостижимости живого прогона по С-4.
 *
 * На С-5 запись `LiveUnreachable` печатается прямо в клетке (`исключение: причина`),
 * а на С-4 клетки не производит вовсе — иначе она снимала бы дыру гейта и не
 * устаревала бы никогда (см. `computeRow`). Без этого раздела читатель матрицы видел
 * бы на С-4 голое `не наблюдалось` там, где причина известна и записана, и полез бы
 * заводить пробу, которую уже пробовали.
 *
 * Выбран раздел под таблицей, а не сноска в клетке: словарь клеток С-4 читает
 * `collectCheckFailures` и храповик базлайна, и любой маркер в тексте клетки пришлось
 * бы либо вносить в этот словарь, либо чистить перед сверкой.
 */
function renderLiveUnreachableSection(): string {
  const c4Records = LIVE_UNREACHABLE.filter((record) => record.property === 'С-4');
  if (c4Records.length === 0) {
    return '';
  }
  const rows = c4Records
    .map(
      (record) =>
        `| \`${record.tool}\` | ${record.reason} | ${record.whatWouldClose} | \`${record.report}\` |`
    )
    .join('\n');
  return (
    `\n## С-4: живой прогон недостижим — причины\n\n` +
    `Клетка С-4 у этих инструментов читается \`не наблюдалось\`, но причина известна и ` +
    `записана в \`tests/coverage-exceptions/live-observations.ts\` (\`LiveUnreachable\`). ` +
    `Клетку запись НЕ закрывает намеренно: иначе она снимала бы дыру гейта и не устаревала ` +
    `бы никогда.\n\n` +
    `| Инструмент | Почему недостижим | Что снимет запись | Отчёт |\n|---|---|---|---|\n` +
    rows +
    '\n'
  );
}

/**
 * Раздел под таблицей: снятые живые наблюдения.
 *
 * Заведён по той же причине, что и раздел про недостижимость С-4: без него клетка
 * снятой пары читается «не наблюдалось» и от «никогда не наблюдалось» неотличима, а
 * причина снятия и условие возврата живут только в исходнике реестра. Пуст — раздела
 * нет вовсе: пустая таблица в артефакте сообщала бы о механизме, а не о факте.
 */
function renderRetiredObservationsSection(): string {
  if (RETIRED_LIVE_OBSERVATIONS.length === 0) {
    return '';
  }
  const rows = RETIRED_LIVE_OBSERVATIONS.map(
    (record) =>
      `| \`${record.tool}\` | ${record.property} | ${record.reason} | ${record.whatWouldClose} | \`${record.runLabel}\` | \`${record.report}\` |`
  ).join('\n');
  return (
    `\n## Снятые живые наблюдения\n\n` +
    `Наблюдение относилось к другой версии контракта и снято сознательно ` +
    `(\`RetiredLiveObservation\`, \`tests/coverage-exceptions/live-observations.ts\`). ` +
    `Клетка читается \`не наблюдалось\`, и это не «потеряли тест»: для свойств гейта ` +
    `(${GATED_PROPERTIES.join('/')}) пара обязана стоять в \`COVERAGE_GATE_BASELINE\`, для ` +
    `С-5 — не должна там стоять вовсе.\n\n` +
    `| Инструмент | Свойство | Почему снято | Что вернёт клетку | Метка снятого прогона | Отчёт |\n|---|---|---|---|---|---|\n` +
    rows +
    '\n'
  );
}

/**
 * Виды клеток, означающие «состав кейсов не гарантирован». Перечень явный, а не
 * подстрока: клетка С-4 несёт ту же оговорку под другим именем
 * (`мок (гипотеза, устаревшая оснастка)`), и до перевода С-4 на гипотезу счётчик
 * совпадал с фактом случайно — по клеткам С-2/С-3/С-6 того же инструмента.
 */
const LEGACY_HARNESS_CELL_KINDS: ReadonlySet<Cell['kind']> = new Set([
  'мок (устаревшая оснастка)',
  'мок (гипотеза, устаревшая оснастка)',
]);

/**
 * Число инструментов, у которых хотя бы одна клетка стоит на устаревшей оснастке
 * (третье число долга, решение оркестратора по находке C-2): величина, которую
 * обязан уменьшать возможный будущий этап миграции старых тестов на фабрику
 * `describeToolIntegration`. Должно быть видимым числом в отчёте, а не растворяться
 * в зелёном `coverage:check`.
 */
function collectLegacyMockToolCount(results: readonly RowResult[]): number {
  return results.filter((result) =>
    Object.values(result.cells).some((cell) => LEGACY_HARNESS_CELL_KINDS.has(cell.kind))
  ).length;
}

function renderFooter(results: readonly RowResult[]): string {
  const notObserved = (property: CoverageProperty): number =>
    results.filter((result) => result.cells[property].kind === 'не наблюдалось').length;
  const legacyMockToolCount = collectLegacyMockToolCount(results);
  return (
    `\n## Объём работ следующих этапов\n\n` +
    `- С-5 не наблюдалось: ${String(notObserved('С-5'))} — объём работ этапа 3.1 (живая приёмка).\n` +
    `- С-7 не наблюдалось: ${String(notObserved('С-7'))} — объём работ этапа P2.\n` +
    `- на устаревшей оснастке: ${String(legacyMockToolCount)} инструментов — состав кейсов не гарантирован ` +
    `(кандидат миграции на фабрику describeToolIntegration).\n`
  );
}

interface CheckFailure {
  readonly tool: string;
  readonly property: CoverageProperty;
  readonly reason: string;
}

function collectCheckFailures(results: readonly RowResult[]): CheckFailure[] {
  const failures: CheckFailure[] = [];
  for (const result of results) {
    // Перечень свойств гейта живёт в `coverage-gate-baseline.ts`: его читает и текст
    // отказа по расхождению отпечатка, где ошибка в составе давала бы совет «допиши
    // строку базлайна» для свойства, которого гейт не сверяет вовсе (С-5).
    for (const property of GATED_PROPERTIES) {
      const cell = result.cells[property];
      if (cell.kind === 'не наблюдалось') {
        failures.push({
          tool: result.row.baseName,
          property,
          reason:
            'нет интеграционного теста (или он describe.skip/it.skip) и нет записи в реестре исключений',
        });
      }
    }
  }
  return failures;
}

interface StaleException {
  readonly tool: string;
  readonly property: CoverageProperty;
}

/**
 * Клетки, где свойство реально наблюдалось (в отличие от гипотезы или исключения).
 *
 * Клетки с пометкой гипотезы сюда НЕ входят, и это следствие перевода всех С-4 на
 * гипотезу: пока `мок (гипотеза)` считался наблюдением, любая будущая запись
 * `CoverageException` на С-4 объявлялась бы устаревшей сразу — «исключение на С-4»
 * стало бы недостижимым навсегда. Сегодня это не ломается только потому, что реестр
 * `CoverageException` пуст. Гипотеза наблюдением не является по определению.
 *
 * Множество используется ровно в одном месте (`collectStaleExceptions`); гейт живёт
 * на `GATED_PROPERTIES` и клетке `не наблюдалось`, поэтому правка состава
 * гейта не касается.
 */
const OBSERVED_CELL_KINDS: ReadonlySet<Cell['kind']> = new Set([
  'unit',
  'мок',
  'живьём',
  'мок (устаревшая оснастка)',
]);

/**
 * Запись реестра устарела, если инструмент уже получил рабочий тест на то же
 * свойство — исключение перестало быть исключением, но продолжает загромождать
 * реестр (M-9, найдено ревью пакета): без этой проверки реестр копит мусор навсегда,
 * потому что `coverage:check` не отличает актуальное исключение от забытого.
 */
function collectStaleExceptions(
  results: readonly RowResult[],
  exceptions: readonly CoverageException[]
): StaleException[] {
  const resultByTool = new Map(results.map((result) => [result.row.baseName, result]));
  const stale: StaleException[] = [];
  for (const exception of exceptions) {
    const result = resultByTool.get(exception.tool);
    if (!result) continue; // несуществующий tool уже роняет loadCoverageExceptions раньше
    if (OBSERVED_CELL_KINDS.has(result.cells[exception.property].kind)) {
      stale.push({ tool: exception.tool, property: exception.property });
    }
  }
  return stale;
}

/**
 * `--check` не пишет файл (M-6, найдено ревью пакета): раньше `writeFileSync`
 * выполнялся безусловно до проверки `checkMode`, и `--check` под кэшем Turborepo
 * (`outputs: []` у задачи `coverage:check`) не восстанавливал файл — кэш-хит давал
 * грязное git-дерево в CI. Плюс `--check` не сравнивал сгенерированное с
 * закоммиченным, то есть устаревшую матрицу можно было закоммитить незаметно — ровно
 * тот класс дефекта «производный артефакт разъехался», ради которого весь этап и
 * существует. Теперь режим проверки только читает и сравнивает, не изменяя дерево.
 */
async function main(): Promise<void> {
  const checkMode = process.argv.includes('--check');

  validateLegacyMockTestList({
    paths: LEGACY_MOCK_TEST_PATHS,
    baselineCount: LEGACY_MOCK_TEST_BASELINE_COUNT,
    packageRoot: PACKAGE_ROOT,
  });

  // Снимок базлайна — то, относительно чего считается «строку дописали». Проверяется в
  // ОБОИХ режимах: барьер, снимаемый запуском `coverage:matrix`, барьером не является.
  assertBaselineOriginIntact();

  validateLiveRegistry({
    observations: LIVE_OBSERVATIONS,
    unreachable: LIVE_UNREACHABLE,
    validTools: knownToolBaseNames(),
    packageRoot: PACKAGE_ROOT,
  });

  // Отказ идёт в ОБОИХ режимах, а не только под `--check`: барьер, который снимается
  // запуском `coverage:matrix`, барьером не является — расхождение отпечатка иначе
  // «чинилось» бы перегенерацией матрицы.
  const { fingerprints, readErrors } = buildFingerprintIndex();
  const mismatches = collectFingerprintMismatches(
    LIVE_OBSERVATIONS,
    (tool) => fingerprints.get(tool),
    (tool) => readErrors.get(tool)
  );
  if (mismatches.length > 0) {
    console.error(formatFingerprintMismatchFailure(mismatches));
    process.exitCode = 1;
    return;
  }

  const categoryIndex = buildCategoryIndex();
  const testFileIndex = buildTestFileIndex();
  validateLegacyMockPathsNotMigrated(testFileIndex);
  const exceptions = await loadCoverageExceptions();
  const rows = buildToolRows(categoryIndex);
  const results = rows.map((row) => computeRow(row, testFileIndex, exceptions));

  const markdown =
    renderHeader(rows.length) +
    renderTable(results) +
    renderLiveUnreachableSection() +
    renderRetiredObservationsSection() +
    renderFooter(results);

  if (!checkMode) {
    writeFileSync(OUTPUT_PATH, markdown, 'utf-8');

    console.log(`Матрица покрытия записана: ${OUTPUT_PATH} (${String(rows.length)} инструментов)`);
    return;
  }

  let ok = true;

  const committed = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf-8') : null;
  if (committed !== markdown) {
    ok = false;

    console.error(
      committed === null
        ? `coverage:check: ${OUTPUT_PATH} не найден — прогони "npm run coverage:matrix" и закоммить файл.`
        : `coverage:check: ${OUTPUT_PATH} разошёлся со сгенерированным содержимым — прогони ` +
            `"npm run coverage:matrix" и закоммить обновление.`
    );
  }

  // Дыры сверяются с замороженным НАБОРОМ пар, а не с числом: скаляр не отличает
  // новую дыру от унаследованной. Отказ идёт в обе стороны — иначе закрытая дыра
  // остаётся разрешённой к возврату навсегда.
  const failures = collectCheckFailures(results);
  const gate = collectCoverageGateViolations(failures, COVERAGE_GATE_BASELINE, retiredLiveKeys());
  const gateLines = formatCoverageGateFailures(gate);
  if (gateLines.length > 0) {
    ok = false;

    for (const line of gateLines) console.error(line);
  }
  if (failures.length > 0 && gate.appeared.length === 0 && gate.closed.length === 0) {
    console.log(
      `coverage:check: ${String(failures.length)} унаследованных дыр в базлайне — долг виден, но не растёт.`
    );
  }

  const resultByTool = new Map(results.map((result) => [result.row.baseName, result]));
  const staleLines = formatStaleLiveRegistryFailures(
    LIVE_UNREACHABLE,
    RETIRED_LIVE_OBSERVATIONS,
    (tool, property) => resultByTool.get(tool)?.cells[property].kind
  );
  const staleExceptions = collectStaleExceptions(results, exceptions);
  if (staleLines.length > 0 || staleExceptions.length > 0) {
    ok = false;

    for (const line of staleLines) console.error(line);
    for (const stale of staleExceptions) {
      console.error(
        `coverage:check: запись реестра исключений устарела — ${stale.tool} [${stale.property}]: ` +
          `у инструмента уже есть рабочий тест на это свойство, удали её из tests/coverage-exceptions/`
      );
    }
  }

  if (ok) {
    console.log(
      'coverage:check зелён — матрица актуальна, новых дыр сверх базлайна нет, устаревших записей реестров нет.'
    );
    return;
  }

  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
