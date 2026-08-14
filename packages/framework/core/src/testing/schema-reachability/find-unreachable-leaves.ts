/**
 * Проверка "лист сгенерированного образца нашёлся в сериализованном виде
 * исходящих HTTP-вызовов" (пакет 7.1.E плана модернизации MCP 2026-07-28).
 * Чистая функция — HTTP-спаи и обход реестра инструментов остаются заботой
 * теста конкретного сервера (см. `http-client-call-recorder.ts` для спаев,
 * тест-файлы серверов — за обходом реестра, т.к. у каждого свой
 * DI-контейнер).
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
 */

import type { ReachabilityLeaf } from './generate-reachability-sample.js';

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

/** Один лист, маркер которого НЕ нашёлся в исходящих HTTP-вызовах. */
export interface UnreachableLeaf {
  readonly path: string;
  readonly leaf: ReachabilityLeaf;
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
 * Найти листья сгенерированного образца, чьи маркеры НЕ нашлись в
 * `haystack` (обычно — `JSON.stringify` накопленных вызовов HTTP-клиента,
 * см. `HttpClientCallRecorder.haystack()`), за вычетом путей, явно
 * перечисленных в `exceptions` (с обязательной причиной — см. её тип).
 *
 * @returns пустой массив, если ВСЕ листья (кроме исключённых) достигли wire.
 */
export function findUnreachableLeaves(
  haystack: string,
  leaves: ReadonlyMap<string, ReachabilityLeaf>,
  exceptions: readonly ReachabilityException[] = []
): UnreachableLeaf[] {
  const exceptionsByPath = new Map(exceptions.map((e) => [e.path, e]));
  const unreachable: UnreachableLeaf[] = [];

  for (const [path, leaf] of leaves) {
    const exception = exceptionsByPath.get(path);
    if (exception && exception.wireFieldName === undefined) {
      continue; // полностью исключён
    }
    if (!leafReachesWire(haystack, leaf, exception?.wireFieldName)) {
      unreachable.push({ path, leaf });
    }
  }

  return unreachable;
}

/** Отформатировать читаемое сообщение об ошибке для одного недостижимого листа. */
export function describeUnreachableLeaf(toolName: string, unreachable: UnreachableLeaf): string {
  const { path, leaf } = unreachable;
  const leafDescription =
    leaf.kind === 'boolean' ? `boolean, имя "${leaf.fieldName}"` : `значение "${leaf.value}"`;
  return (
    `Поле "${path}" (${leafDescription}) инструмента "${toolName}" не найдено ни в одном исходящем ` +
    'HTTP-вызове (path/body/query) — похоже, схема объявляет параметр, который операция не отправляет ' +
    'в API. Если это ложное срабатывание (поле легитимно не форвардится 1:1), добавь путь в exceptions ' +
    'теста этого сервера с обоснованием.'
  );
}
