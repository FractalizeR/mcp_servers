/**
 * Проверка "лист сгенерированного образца нашёлся в сериализованном виде
 * исходящих HTTP-вызовов" (пакет 7.1.E плана модернизации MCP 2026-07-28;
 * привязка к ЦЕЛЕВОМУ запросу — фикс слепого пятна, найденного эмпирически
 * позже — см. `selectTargetCalls()` ниже). Чистая функция — HTTP-спаи и
 * обход реестра инструментов остаются заботой теста конкретного сервера
 * (см. `http-client-call-recorder.ts` для спаев, тест-файлы серверов — за
 * обходом реестра, т.к. у каждого свой DI-контейнер).
 *
 * СОВПАДЕНИЕ ПО ЗНАЧЕНИЮ, НЕ ПО ИМЕНИ КЛЮЧА — для scalar-листьев:
 * `ReachabilityLeaf.value` — уникальный маркер, сгенерированный
 * `generateReachabilitySample()`. Если операция форвардит значение поля 1:1
 * под ДРУГИМ именем ключа (частый случай: `body_location` схемы →
 * `{ location: body_location }` DTO), маркер всё равно найдётся — поиск не
 * привязан к имени ключа. Отдельного механизма "переименованных полей" для
 * scalar не нужно (в отличие от прежней Wiki-версии, где он был нужен из-за
 * key-first стратегии сопоставления).
 *
 * BOOLEAN — ОСОБЫЙ СЛУЧАЙ (тонкость, из-за которой первая версия
 * Трекер-теста ошибалась): `true`/`false` сами по себе не уникальны — почти
 * любой ответ содержит `true` где-нибудь. Голый substring-поиск `true` не
 * отличает "это поле дошло" от "где-то в JSON есть true". Поэтому для
 * `kind: 'boolean'` ищется ПАРА "имя поля + значение":
 * `"fieldName":true` (JSON-тело) ИЛИ `fieldName=true` (query-строка). Из-за
 * этого boolean-лист, В ОТЛИЧИЕ ОТ scalar, ВСЁ ЖЕ чувствителен к
 * переименованию ключа на wire (пример из Wiki: схема `anchor_fallback` →
 * DTO `{ anchor: { fallback: anchor_fallback } }` — ключ на wire `fallback`,
 * не `anchor_fallback`) — для такого случая `ReachabilityException` несёт
 * `wireFieldName` (см. ниже), а не полное исключение листа из проверки.
 *
 * ПРИВЯЗКА К ЦЕЛЕВОМУ ЗАПРОСУ (`selectTargetCalls`), СЛЕПОЕ ПЯТНО КОТОРОЕ ОНА
 * ЗАКРЫВАЕТ: прежняя версия проверяла присутствие маркера в СКЛЕЙКЕ ВСЕХ
 * исходящих вызовов инструмента — отвечала на вопрос "долетело хоть куда-то",
 * а не "долетело в тот запрос, который должен его отправить". У инструментов
 * с несколькими HTTP-вызовами (подготовительное чтение + собственно запись)
 * это давало ложноотрицательный результат: параметр, потерянный именно в
 * целевом запросе, засчитывался достигшим цели, если случайно (или по
 * замыслу другого поля) совпал с содержимым ПОДГОТОВИТЕЛЬНОГО вызова.
 * Живой пример: TickTick `complete_task` делает `GET
 * .../task/{taskId}` (подготовка — достать title), затем `POST
 * .../task/{taskId}/complete` (цель). Дефект — `projectId` не попадал в
 * целевой POST (`/task/{taskId}/complete` без `/project/{projectId}` в
 * пути) — но попадал в предшествующий GET, и старая проверка была зелёной.
 *
 * ПРАВИЛО ВЫБОРА ЦЕЛИ: целевой запрос — ПОСЛЕДНИЙ по порядку вызов
 * МУТИРУЮЩИМ методом (`post`/`patch`/`delete`/`postWithResponse`); если
 * инструмент вообще не сделал мутирующего вызова (чистое чтение — только
 * `get`/`getWithResponse`), целевым считается весь набор вызовов (прежнее
 * поведение). Эмпирически проверено на write-инструментах всех трёх
 * серверов, делающих >1 HTTP-вызов (TickTick: `complete_task`,
 * `delete_task`, `delete_project`; Wiki: `update_page`) — во ВСЕХ случаях
 * ровно один мутирующий вызов, и он ПОСЛЕДНИЙ (подготовительные чтения
 * предшествуют записи, не наоборот). `postWithResponse` включён в мутирующие
 * методы наравне с `post` — Трекер использует его и для настоящих мутаций
 * (`create_issue`), и для read-only "поиска через POST" (`find_issues`,
 * `search_worklog`) — в обоих случаях это ЕДИНСТВЕННЫЙ мутирующий-по-методу
 * вызов инструмента, так что выбор цели не портит и read-инструменты.
 */

import type { ReachabilityLeaf } from './generate-reachability-sample.js';
import type { RecordedCall, HttpClientMethodName } from './http-client-call-recorder.js';

/** Методы `IHttpClient`, которые считаются "мутирующими" для отбора целевого запроса. */
const MUTATING_METHODS: ReadonlySet<HttpClientMethodName> = new Set([
  'post',
  'patch',
  'delete',
  'postWithResponse',
]);

/**
 * Выбрать целевой подмножество вызовов из полного накопленного списка (см.
 * заголовок файла за обоснованием правила).
 *
 * @returns последний мутирующий вызов (как единственный элемент массива),
 *   либо ВСЕ вызовы, если ни один не был мутирующим.
 */
export function selectTargetCalls(calls: readonly RecordedCall[]): readonly RecordedCall[] {
  for (let i = calls.length - 1; i >= 0; i -= 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const call = calls[i]!;
    if (MUTATING_METHODS.has(call.method)) {
      return [call];
    }
  }
  return calls;
}

function joinHaystack(calls: readonly RecordedCall[]): string {
  return calls.map((call) => call.serialized).join('\n');
}

/**
 * Исключение для одного листа. `reason` ОБЯЗАТЕЛЕН — план 7.1.E прямо
 * требует "список исключений с причиной, а не молчаливый пропуск". Два
 * режима:
 * - `wireFieldName` НЕ задан — лист полностью исключён из проверки (поле
 *   осознанно не отправляется в API вообще, например `fields` — клиентская
 *   фильтрация ответа).
 * - `wireFieldName` задан — лист НЕ исключается, а проверяется под другим
 *   именем ключа на wire. Имеет смысл только для `kind: 'boolean'` (см.
 *   заголовок файла) — scalar-листья и так матчатся по значению независимо
 *   от имени ключа.
 */
export interface ReachabilityException {
  /**
   * Путь листа в нотации генератора: `fieldName`, `fieldName[]` (элемент
   * массива), `nested.fieldName`, `record.markerKey` — см.
   * `ReachabilitySample.leaves` (ключи карты).
   */
  readonly path: string;
  /** ОБЯЗАТЕЛЬНАЯ причина исключения/переименования. */
  readonly reason: string;
  /** См. описание типа выше — задаётся только для boolean-листьев, форвардящихся под другим именем ключа. */
  readonly wireFieldName?: string;
}

/**
 * Один лист, маркер которого НЕ нашёлся в ЦЕЛЕВОМ HTTP-вызове.
 *
 * `foundInNonTargetCall` — маркер нашёлся ГДЕ-ТО среди накопленных вызовов
 * (обычно — в подготовительном чтении), но не в вызове, который
 * `selectTargetCalls()` выбрал как целевой. Это ИМЕННО тот класс дефекта,
 * ради которого привязка к целевому запросу введена (см. заголовок файла,
 * пример `complete_task`) — отдельный флаг вместо тихого "не найдено вовсе",
 * чтобы `describeUnreachableLeaf()` мог прямо назвать причину.
 */
export interface UnreachableLeaf {
  readonly path: string;
  readonly leaf: ReachabilityLeaf;
  readonly foundInNonTargetCall: boolean;
}

function leafReachesWire(
  haystack: string,
  leaf: ReachabilityLeaf,
  wireFieldName?: string
): boolean {
  if (leaf.kind === 'boolean') {
    const fieldName = wireFieldName ?? leaf.fieldName;
    return (
      haystack.includes(`"${fieldName}":${leaf.value}`) ||
      haystack.includes(`${fieldName}=${leaf.value}`)
    );
  }
  return haystack.includes(leaf.value);
}

/**
 * Найти листья сгенерированного образца, чьи маркеры НЕ нашлись в ЦЕЛЕВОМ
 * подмножестве накопленных HTTP-вызовов (см. `selectTargetCalls()` и
 * заголовок файла за обоснованием привязки к цели, а не ко всему потоку),
 * за вычетом путей, явно перечисленных в `exceptions` (с обязательной
 * причиной — см. её тип).
 *
 * @param calls - ВСЕ накопленные вызовы за время `tool.execute()`, в порядке
 *   выполнения (`HttpClientCallRecorder.calls()`).
 * @returns пустой массив, если ВСЕ листья (кроме исключённых) достигли цели.
 */
export function findUnreachableLeaves(
  calls: readonly RecordedCall[],
  leaves: ReadonlyMap<string, ReachabilityLeaf>,
  exceptions: readonly ReachabilityException[] = []
): UnreachableLeaf[] {
  const exceptionsByPath = new Map(exceptions.map((e) => [e.path, e]));
  const targetHaystack = joinHaystack(selectTargetCalls(calls));
  const fullHaystack = joinHaystack(calls);
  const unreachable: UnreachableLeaf[] = [];

  for (const [path, leaf] of leaves) {
    const exception = exceptionsByPath.get(path);
    if (exception && exception.wireFieldName === undefined) {
      continue; // полностью исключён
    }
    const wireFieldName = exception?.wireFieldName;
    if (!leafReachesWire(targetHaystack, leaf, wireFieldName)) {
      unreachable.push({
        path,
        leaf,
        foundInNonTargetCall: leafReachesWire(fullHaystack, leaf, wireFieldName),
      });
    }
  }

  return unreachable;
}

/** Отформатировать читаемое сообщение об ошибке для одного недостижимого листа. */
export function describeUnreachableLeaf(toolName: string, unreachable: UnreachableLeaf): string {
  const { path, leaf, foundInNonTargetCall } = unreachable;
  const leafDescription =
    leaf.kind === 'boolean' ? `boolean, имя "${leaf.fieldName}"` : `значение "${leaf.value}"`;

  if (foundInNonTargetCall) {
    return (
      `Поле "${path}" (${leafDescription}) инструмента "${toolName}" нашлось в ПОДГОТОВИТЕЛЬНОМ ` +
      'HTTP-вызове (например, чтении перед записью), но НЕ в целевом (последнем мутирующем) запросе — ' +
      'похоже, операция теряет параметр именно в запросе, который должен его отправить (класс дефекта ' +
      'TickTick complete_task: projectId доезжал до GET, но не до целевого POST). Если это ложное ' +
      'срабатывание, добавь путь в exceptions теста этого сервера с обоснованием.'
    );
  }

  return (
    `Поле "${path}" (${leafDescription}) инструмента "${toolName}" не найдено ни в одном исходящем ` +
    'HTTP-вызове (path/body/query) — похоже, схема объявляет параметр, который операция не отправляет ' +
    'в API. Если это ложное срабатывание (поле легитимно не форвардится 1:1), добавь путь в exceptions ' +
    'теста этого сервера с обоснованием.'
  );
}
