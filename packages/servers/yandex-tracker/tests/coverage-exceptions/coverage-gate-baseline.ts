/**
 * Храповик дыр покрытия: замороженный НАБОР пар `(инструмент, свойство)`, которые
 * `coverage:check` разрешает оставлять непокрытыми. Набор — а не число: скаляр
 * физически не отличает новую дыру от унаследованной, и закрытие одной клетки с
 * одновременной потерей теста у другого инструмента оставило бы прежнее число и
 * зелёный гейт.
 *
 * Прецедент в этом же репозитории двойной: бюджеты `--max-warnings` по пакетам
 * («двигать только вниз», корневой `CLAUDE.md` §«Уровни правил») и
 * `LEGACY_MOCK_TEST_PATHS` в соседнем файле.
 *
 * ХРАПОВИК ОТКАЗЫВАЕТ В ОБЕ СТОРОНЫ:
 * - пара вне набора стала дырой — отказ с её именем (дыр стало больше);
 * - пара из набора перестала быть дырой — тоже отказ, с требованием убрать строку.
 *   Иначе храповик протухает так же, как протухло категорийное исключение: дыру
 *   закрыли, а гейт продолжает разрешать её вернуть.
 *
 * Основное легитимное изменение файла — УДАЛЕНИЕ строки вместе с появлением теста.
 *
 * Единственное исключение — СНЯТОЕ ЖИВОЕ НАБЛЮДЕНИЕ: строку разрешено дописать, только
 * если на ту же пару заведена `RetiredLiveObservation` (`live-observations.ts`).
 * Проверяется это машинно — сверкой с замороженным снимком
 * `COVERAGE_GATE_BASELINE_ORIGIN`: ключ текущего базлайна, которого нет в снимке и на
 * который нет записи о снятии, попадает в `addedWithoutRetirement` и роняет прогон.
 * Снятие наблюдения и потеря теста — разные события: первое означает, что
 * прежнее наблюдение относилось к другой версии контракта, второе — что покрытие
 * ухудшилось; смешивать их в одном диагнозе значит советовать «верни тест» тому, у
 * кого теста и не было. Без записи о снятии дописанная строка по-прежнему запрещена.
 *
 * Снято ПОСЛЕ наполнения реестра живых наблюдений: 87 пар — это 23
 * инструментов без единого интеграционного теста, умноженные на непокрытые из
 * четырёх наблюдаемых мокой свойств (С-2/С-3/С-4/С-6). Пять клеток С-4 из
 * исходных 92 закрыл живой прогон. Покрытие этих инструментов тестами — отдельный
 * заход; храповик фиксирует, что хуже не станет, и делает долг видимым в каждом
 * прогоне валидации.
 *
 * Снято командой (после `npm run coverage:matrix`):
 *
 *   npm run coverage:check 2>&1 | grep -oE '^  - [a-z_]+ \[С-[0-9]\]' \
 *     | sed 's/^  - //;s/ //' | sort
 */

import { createHash } from 'node:crypto';
import type { CoverageProperty } from './types.js';

/** `двигать только вниз`; снято 2026-08-26. */
export const COVERAGE_GATE_BASELINE: ReadonlySet<string> = new Set([
  'add_worklog[С-2]',
  'add_worklog[С-3]',
  'add_worklog[С-6]',
  'analyze_issue_description[С-2]',
  'analyze_issue_description[С-3]',
  'analyze_issue_description[С-4]',
  'analyze_issue_description[С-6]',
  'bulk_move_issues[С-2]',
  'bulk_move_issues[С-3]',
  'bulk_move_issues[С-4]',
  'bulk_move_issues[С-6]',
  'bulk_transition_issues[С-2]',
  'bulk_transition_issues[С-3]',
  'bulk_transition_issues[С-4]',
  'bulk_transition_issues[С-6]',
  'bulk_update_issues[С-2]',
  'bulk_update_issues[С-3]',
  'bulk_update_issues[С-4]',
  'bulk_update_issues[С-6]',
  'create_queue_local_field[С-2]',
  'create_queue_local_field[С-3]',
  'create_queue_local_field[С-6]',
  'delete_worklog[С-2]',
  'delete_worklog[С-3]',
  'delete_worklog[С-4]',
  'delete_worklog[С-6]',
  'demo[С-2]',
  'demo[С-3]',
  'demo[С-4]',
  'demo[С-6]',
  'find_users[С-2]',
  'find_users[С-3]',
  'find_users[С-4]',
  'find_users[С-6]',
  'get_bulk_change_status[С-2]',
  'get_bulk_change_status[С-3]',
  'get_bulk_change_status[С-4]',
  'get_bulk_change_status[С-6]',
  'get_issue_types[С-2]',
  'get_issue_types[С-3]',
  'get_issue_types[С-4]',
  'get_issue_types[С-6]',
  'get_issue_urls[С-2]',
  'get_issue_urls[С-3]',
  'get_issue_urls[С-4]',
  'get_issue_urls[С-6]',
  'get_priorities[С-2]',
  'get_priorities[С-3]',
  'get_priorities[С-4]',
  'get_priorities[С-6]',
  'get_queue_local_fields[С-2]',
  'get_queue_local_fields[С-3]',
  'get_queue_local_fields[С-4]',
  'get_queue_local_fields[С-6]',
  'get_resolutions[С-2]',
  'get_resolutions[С-3]',
  'get_resolutions[С-4]',
  'get_resolutions[С-6]',
  'get_statuses[С-2]',
  'get_statuses[С-3]',
  'get_statuses[С-4]',
  'get_statuses[С-6]',
  'get_users[С-2]',
  'get_users[С-3]',
  'get_users[С-4]',
  'get_users[С-6]',
  'get_worklogs[С-2]',
  'get_worklogs[С-3]',
  'get_worklogs[С-6]',
  'ping[С-2]',
  'ping[С-3]',
  'ping[С-4]',
  'ping[С-6]',
  'raw_api_request[С-2]',
  'raw_api_request[С-3]',
  'raw_api_request[С-4]',
  'raw_api_request[С-6]',
  'search_worklog[С-2]',
  'search_worklog[С-3]',
  'search_worklog[С-4]',
  'search_worklog[С-6]',
  'update_queue_local_field[С-2]',
  'update_queue_local_field[С-3]',
  'update_queue_local_field[С-6]',
  'update_worklog[С-2]',
  'update_worklog[С-3]',
  'update_worklog[С-6]',
]);

/**
 * ИСХОДНЫЙ СНИМОК базлайна: те же 87 пар по состоянию на 2026-08-26, замороженные
 * навсегда. Снимок — не второй базлайн: он фиксирует, чем долг БЫЛ, а текущий состав
 * долга живёт в `COVERAGE_GATE_BASELINE` и только сокращается.
 *
 * Без снимка правило «дописывать строку нельзя» остаётся правилом на словах: дописанная
 * пара неотличима от унаследованной (`appeared` пуст, гейт зелёный), и потерянный тест
 * гасится строкой ровно так же, как до храповика. Со снимком
 * `collectCoverageGateViolations` сверяет каждый ключ текущего базлайна: ключ вне
 * снимка законен, только если на ту же пару заведена `RetiredLiveObservation`.
 *
 * Дописывание в САМ снимок закрыто отпечатком (`COVERAGE_GATE_BASELINE_ORIGIN_DIGEST`):
 * лишняя строка роняет прогон, пока автор не перепишет и отпечаток. Путь «правлю снимок
 * и отпечаток вместе» машинно не закрывается — но он перестаёт быть незаметным: в диффе
 * видно три правки вместо одной, и ни одна из них не выглядит рутинной.
 */
export const COVERAGE_GATE_BASELINE_ORIGIN: ReadonlySet<string> = new Set([
  'add_worklog[С-2]',
  'add_worklog[С-3]',
  'add_worklog[С-6]',
  'analyze_issue_description[С-2]',
  'analyze_issue_description[С-3]',
  'analyze_issue_description[С-4]',
  'analyze_issue_description[С-6]',
  'bulk_move_issues[С-2]',
  'bulk_move_issues[С-3]',
  'bulk_move_issues[С-4]',
  'bulk_move_issues[С-6]',
  'bulk_transition_issues[С-2]',
  'bulk_transition_issues[С-3]',
  'bulk_transition_issues[С-4]',
  'bulk_transition_issues[С-6]',
  'bulk_update_issues[С-2]',
  'bulk_update_issues[С-3]',
  'bulk_update_issues[С-4]',
  'bulk_update_issues[С-6]',
  'create_queue_local_field[С-2]',
  'create_queue_local_field[С-3]',
  'create_queue_local_field[С-6]',
  'delete_worklog[С-2]',
  'delete_worklog[С-3]',
  'delete_worklog[С-4]',
  'delete_worklog[С-6]',
  'demo[С-2]',
  'demo[С-3]',
  'demo[С-4]',
  'demo[С-6]',
  'find_users[С-2]',
  'find_users[С-3]',
  'find_users[С-4]',
  'find_users[С-6]',
  'get_bulk_change_status[С-2]',
  'get_bulk_change_status[С-3]',
  'get_bulk_change_status[С-4]',
  'get_bulk_change_status[С-6]',
  'get_issue_types[С-2]',
  'get_issue_types[С-3]',
  'get_issue_types[С-4]',
  'get_issue_types[С-6]',
  'get_issue_urls[С-2]',
  'get_issue_urls[С-3]',
  'get_issue_urls[С-4]',
  'get_issue_urls[С-6]',
  'get_priorities[С-2]',
  'get_priorities[С-3]',
  'get_priorities[С-4]',
  'get_priorities[С-6]',
  'get_queue_local_fields[С-2]',
  'get_queue_local_fields[С-3]',
  'get_queue_local_fields[С-4]',
  'get_queue_local_fields[С-6]',
  'get_resolutions[С-2]',
  'get_resolutions[С-3]',
  'get_resolutions[С-4]',
  'get_resolutions[С-6]',
  'get_statuses[С-2]',
  'get_statuses[С-3]',
  'get_statuses[С-4]',
  'get_statuses[С-6]',
  'get_users[С-2]',
  'get_users[С-3]',
  'get_users[С-4]',
  'get_users[С-6]',
  'get_worklogs[С-2]',
  'get_worklogs[С-3]',
  'get_worklogs[С-6]',
  'ping[С-2]',
  'ping[С-3]',
  'ping[С-4]',
  'ping[С-6]',
  'raw_api_request[С-2]',
  'raw_api_request[С-3]',
  'raw_api_request[С-4]',
  'raw_api_request[С-6]',
  'search_worklog[С-2]',
  'search_worklog[С-3]',
  'search_worklog[С-4]',
  'search_worklog[С-6]',
  'update_queue_local_field[С-2]',
  'update_queue_local_field[С-3]',
  'update_queue_local_field[С-6]',
  'update_worklog[С-2]',
  'update_worklog[С-3]',
  'update_worklog[С-6]',
]);

/**
 * Отпечаток снимка — первые 12 hex sha256 от отсортированных ключей
 * (`computeBaselineOriginDigest`). Форма та же, что у `schemaFingerprint` записей
 * живых наблюдений: короткая строка, которую видно в диффе целиком.
 */
export const COVERAGE_GATE_BASELINE_ORIGIN_DIGEST = 'f8f023a7c817';

/**
 * Свойства, которые сверяет гейт покрытия, — единственный источник этого перечня
 * (`collectCheckFailures` в `scripts/build-coverage-matrix.ts` читает его же).
 *
 * Перечень нужен не только гейту: текст отказа по расхождению отпечатка обязан знать,
 * для каких свойств снятие наблюдения требует строки базлайна, а для каких она вредна.
 * С-5 сюда не входит — дырой гейта пара по С-5 не бывает никогда, и дописанная строка
 * `tool[С-5]` немедленно попадёт в `closed` с требованием её убрать.
 */
export const GATED_PROPERTIES: readonly CoverageProperty[] = ['С-2', 'С-3', 'С-4', 'С-6'];

/** Свойство входит в гейт покрытия — то есть его непокрытая клетка бывает дырой. */
export function isGatedProperty(property: CoverageProperty): boolean {
  return GATED_PROPERTIES.includes(property);
}

export function coverageGateKey(tool: string, property: CoverageProperty): string {
  return `${tool}[${property}]`;
}

export interface CoverageHole {
  readonly tool: string;
  readonly property: CoverageProperty;
}

export interface CoverageGateViolations {
  /** Дыры, которых нет в базлайне и объяснить которые нечем, — покрытие ухудшилось. */
  readonly appeared: readonly string[];
  /** Строки базлайна, переставшие быть дырами, — базлайн пора сократить. */
  readonly closed: readonly string[];
  /**
   * Дыры, возникшие из-за СНЯТОГО живого наблюдения, но не дописанные в базлайн.
   * Отдельная категория, а не подвид `appeared`: диагноз «верни тест» тут неверен —
   * теста и не было, клетку держало наблюдение.
   */
  readonly retiredNotInBaseline: readonly string[];
  /**
   * Строки текущего базлайна, которых нет в исходном снимке и на которые нет записи о
   * снятии наблюдения, — база выросла, и объяснить рост нечем. Без этой категории
   * запрет «дописывать строку нельзя» существовал только в комментарии: дописанная
   * пара выглядела унаследованной, `appeared` оставался пуст, гейт — зелёным.
   */
  readonly addedWithoutRetirement: readonly string[];
}

/**
 * Параметризована базлайном (как `validateLegacyMockTestList`), чтобы самотест гонял
 * её на синтетическом наборе, не трогая боевой `COVERAGE_GATE_BASELINE`.
 *
 * `retired` — ключи пар со снятым живым наблюдением (`retiredLiveKeys()`). Храповик от
 * этого не слабеет: снятая пара обязана быть либо в базлайне (тогда нарушения нет и
 * дыра унаследована явно), либо она попадает в `retiredNotInBaseline` и роняет прогон —
 * просто с верным диагнозом. Пара без записи о снятии остаётся в `appeared`.
 *
 * `origin` — замороженный снимок базлайна: он и делает запрет на дописывание машинным.
 * Синтетический прогон обязан передавать свой снимок, иначе его базлайн целиком
 * окажется «дописанным» относительно боевого.
 */
export function collectCoverageGateViolations(
  holes: readonly CoverageHole[],
  baseline: ReadonlySet<string> = COVERAGE_GATE_BASELINE,
  retired: ReadonlySet<string> = new Set(),
  origin: ReadonlySet<string> = COVERAGE_GATE_BASELINE_ORIGIN
): CoverageGateViolations {
  const current = new Set(holes.map((hole) => coverageGateKey(hole.tool, hole.property)));
  const newHoles = [...current].filter((key) => !baseline.has(key)).sort();
  const appeared = newHoles.filter((key) => !retired.has(key));
  const retiredNotInBaseline = newHoles.filter((key) => retired.has(key));
  const closed = [...baseline].filter((key) => !current.has(key)).sort();
  const addedWithoutRetirement = [...baseline]
    .filter((key) => !origin.has(key) && !retired.has(key))
    .sort();
  return { appeared, closed, retiredNotInBaseline, addedWithoutRetirement };
}

/**
 * Текст отказа гейта — здесь, а не в скрипте, по образцу
 * `formatFingerprintMismatchFailure`: реестр, который умеет определить нарушение, обязан
 * уметь и объяснить его. Возвращает готовые строки вывода; пустой массив — нарушений нет.
 *
 * Категорий четыре, и печатаются они по перечню, а не четырьмя ветками: в форме «ветка на
 * категорию» пятая заводится с забытым `ok = false` — отказ напечатан, код возврата ноль.
 */
export function formatCoverageGateFailures(gate: CoverageGateViolations): string[] {
  const file = 'tests/coverage-exceptions/coverage-gate-baseline.ts';
  const sections: { keys: readonly string[]; header: string; line: (key: string) => string }[] = [
    {
      keys: gate.retiredNotInBaseline,
      header:
        `coverage:check: ${String(gate.retiredNotInBaseline.length)} дыр возникло из-за СНЯТОГО ` +
        `живого наблюдения, а не из-за потерянного теста — это разные события, и лечатся они ` +
        `по-разному. Клетку держало наблюдение, теста у инструмента могло не быть вовсе. Допиши ` +
        `строку в ${file} вместе с записью RetiredLiveObservation, которая уже заведена:`,
      line: (key) => `${key}: снято наблюдение, строки базлайна нет`,
    },
    {
      keys: gate.addedWithoutRetirement,
      header:
        `coverage:check: ${String(gate.addedWithoutRetirement.length)} строк базлайна нет в ` +
        `исходном снимке COVERAGE_GATE_BASELINE_ORIGIN и нет записи RetiredLiveObservation на ту ` +
        `же пару — базлайн вырос, и объяснить рост нечем. Дописывать строку разрешено ровно в ` +
        `одном случае: снятое живое наблюдение, вместе с записью о снятии. Иначе строку надо ` +
        `убрать, а покрытие вернуть:`,
      line: (key) => `${key}: строка дописана, записи о снятии наблюдения нет`,
    },
    {
      keys: gate.appeared,
      header:
        `coverage:check: ${String(gate.appeared.length)} дыр сверх базлайна (${file}, двигать ` +
        `только вниз). Либо у инструмента потеряли тест — верни тест; либо строку убрали из ` +
        `базлайна раньше теста — верни строку. Если клетку держало живое наблюдение и его сняли ` +
        `сознательно — это третий случай, и он лечится записью RetiredLiveObservation, а не ` +
        `возвратом теста:`,
      line: (key) =>
        `${key}: нет интеграционного теста (или он describe.skip/it.skip) и нет записи в реестре исключений`,
    },
    {
      keys: gate.closed,
      header:
        `coverage:check: ${String(gate.closed.length)} строк базлайна перестали быть дырами — ` +
        `убери их из ${file}, иначе храповик разрешает вернуть закрытую дыру:`,
      line: (key) => key,
    },
  ];

  const lines: string[] = [];
  for (const section of sections) {
    if (section.keys.length === 0) continue;
    lines.push(section.header, ...section.keys.map((key) => `  - ${section.line(key)}`));
  }
  return lines;
}

/**
 * Отпечаток снимка. Считается по отсортированным ключам, поэтому не зависит от порядка
 * строк в исходнике: значение меняет только состав снимка.
 */
export function computeBaselineOriginDigest(
  origin: ReadonlySet<string> = COVERAGE_GATE_BASELINE_ORIGIN
): string {
  return createHash('sha256')
    .update([...origin].sort().join('\n'))
    .digest('hex')
    .slice(0, 12);
}

/**
 * Снимок правили — прогон падает. Отдельный рубеж, а не часть
 * `collectCoverageGateViolations`: та отвечает на вопрос «законен ли текущий состав
 * базлайна», а этот — «тот ли это снимок, относительно которого мы отвечали».
 */
export function assertBaselineOriginIntact(
  origin: ReadonlySet<string> = COVERAGE_GATE_BASELINE_ORIGIN,
  digest: string = COVERAGE_GATE_BASELINE_ORIGIN_DIGEST
): void {
  const actual = computeBaselineOriginDigest(origin);
  if (actual !== digest) {
    throw new Error(
      `tests/coverage-exceptions/coverage-gate-baseline.ts: состав ` +
        `COVERAGE_GATE_BASELINE_ORIGIN изменён — отпечаток "${actual}" вместо ` +
        `"${digest}". Снимок заморожен: закрытая дыра убирается из ` +
        `COVERAGE_GATE_BASELINE, снимка это не касается. Если правка снимка всё-таки ` +
        `осознанная — перепиши и отпечаток, и объясни правку в ревью: незаметной она ` +
        `быть не должна.`
    );
  }
}
