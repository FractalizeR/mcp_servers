/**
 * Генератор "полностью заполненных" тестовых значений для Zod-схем инструментов
 * (пакет 7.1.E плана модернизации MCP 2026-07-28 — свод проверки достижимости
 * параметров, ранее продублированной в Трекере
 * (`tests/helpers/schema-sample-generator.ts`) и Wiki
 * (`tests/helpers/zod-value-generator.ts`)).
 *
 * ПРОБЛЕМА, которую решает: параметр объявлен в Zod-схеме инструмента, доходит
 * до валидации, но операция его никуда не отправляет (доехал до Tool, не
 * доехал до HTTP-запроса). Оба сервера наступили на этот класс дефекта
 * независимо. Проверка (см. `check-schema-reachability.ts`) обходит реестр
 * инструментов, генерирует ПОЛНОСТЬЮ заполненный набор параметров для КАЖДОГО
 * поля схемы (включая опциональные и вложенные) через этот генератор, и
 * сверяет, что маркер каждого поля нашёлся в сериализованном виде исходящих
 * HTTP-вызовов.
 *
 * СВЕДЕНИЕ ДВУХ ПОДХОДОВ (взято лучшее от каждого):
 * - От Wiki-версии — обход через ПУБЛИЧНЫЙ API Zod (`instanceof`,
 *   `.shape`/`.element`/`.valueType`/`.options`/`.unwrap()`), а не приватный
 *   `_zod.def` (Трекер использовал его напрямую) — устойчивее к апгрейдам
 *   Zod.
 * - От Трекер-версии — ПОЛНЫЙ обход дерева схемы с путями до каждого листа
 *   (`leaves: Map<path, Leaf>`), а не только полей верхнего уровня: у Wiki
 *   вложенные объекты/массивы проверялись только по имени внешнего поля,
 *   что пропускало бы дефект во вложенном поле. И, что явно оговорено планом
 *   как тонкость, — учёт булевых полей ОТДЕЛЬНОЙ проверкой пары
 *   "имя+значение" (`"field":true` / `field=true`), а не голым поиском
 *   подстроки `true` (голый поиск ловил бы случайное совпадение с ЛЮБЫМ
 *   другим `true` в теле запроса и не отличал "поле дошло" от "где-то есть
 *   true" — первая версия теста Трекера ошибалась именно на этом).
 * - НОВОЕ (не было ни в одной из версий): извлечение ограничений поля
 *   (pattern/format/minLength/maxLength/minimum/maximum) через ПУБЛИЧНЫЙ
 *   `z.toJSONSchema()` (тот же генератор, что уже используется в
 *   `definition/schema-to-definition.ts`) вместо приватных `_zod.def.checks`
 *   ИЛИ слепого перебора фиксированного списка кандидатов до первого
 *   `safeParse` успеха. Это одновременно устойчивее (публичный API) и точнее
 *   (значение конструируется из реальных границ, а не угадывается).
 * - Совпадение "поле дошло по значению" (не по имени ключа) само по себе
 *   решает то, для чего Wiki-версии нужна была отдельная таблица
 *   RENAMED_FIELDS: если операция форвардит значение поля 1:1 под другим
 *   именем ключа (например, `body_location` → `{ location: body_location }`),
 *   маркер-значение всё равно найдётся в теле запроса — поиск не привязан к
 *   имени ключа. Никакой отдельный механизм переименования не нужен.
 */

import { z } from 'zod';

/** Максимальная глубина рекурсии — защита от неожиданных циклов/lazy-схем. */
const MAX_DEPTH = 16;

/**
 * Один "лист" сгенерированного значения:
 * - `kind: 'scalar'` — `value` ищется как обычная подстрока в сериализованном
 *   виде исходящих вызовов;
 * - `kind: 'boolean'` — `value` ('true'/'false') САМ ПО СЕБЕ не уникален,
 *   поэтому ищется пара `"fieldName":value` (JSON-тело) ИЛИ `fieldName=value`
 *   (query-строка) — см. заголовок файла, "тонкость" плана 7.1.E.
 */
export interface ReachabilityLeaf {
  readonly kind: 'scalar' | 'boolean';
  readonly value: string;
  readonly fieldName: string;
}

/** Результат генерации: полностью заполненное значение + карта листьев. */
export interface ReachabilitySample {
  readonly value: unknown;
  readonly leaves: ReadonlyMap<string, ReachabilityLeaf>;
}

/**
 * Известные форматы строк (`z.string().uuid()/.email()/...`) → валидный
 * образец. `format` в JSON Schema, сгенерированной `z.toJSONSchema()`, — тот
 * же публичный сигнал, которым уже пользуется `schema-to-definition.ts`.
 */
const KNOWN_FORMAT_SAMPLES: ReadonlyMap<string, string> = new Map([
  ['uuid', '550e8400-e29b-41d4-a716-446655440000'],
  ['email', 'probe@example.com'],
  ['date-time', '2026-01-01T00:00:00Z'],
  ['date', '2026-01-01'],
  ['url', 'https://example.com/probe'],
  ['ipv4', '192.0.2.1'],
]);

export interface GenerateReachabilitySampleOptions {
  /**
   * Поля с ограничением, которое генератор не может вывести САМ из
   * `z.toJSONSchema()` — либо доменный формат, проверяемый КОДОМ приложения
   * (не Zod-схемой; произвольный маркер там упал бы ДО исходящего
   * HTTP-вызова), либо `.refine()` поверх `z.number()`/`z.string()`,
   * ограничивающий значения дискретным множеством, которое JSON Schema не
   * выражает (например, `.refine(v => [0,1,3,5].includes(v))` — приоритет
   * задачи в TickTick: `z.toJSONSchema` не видит refine, генератор выдал бы
   * произвольное число и `safeParse` отклонил бы ВЕСЬ образец ДО HTTP-вызова).
   * Ключ — ПОСЛЕДНИЙ сегмент пути (имя поля, без вложенности); значение —
   * валидный образец (строка ИЛИ число — тип должен совпадать с типом поля).
   * Пример строкового случая (Трекер): `duration` — `AddWorklogOperation`
   * пропускает уже-ISO8601 значения без изменений, но конвертирует
   * человекочитаемые перед отправкой, поэтому маркер не совпал бы с
   * отправленным значением.
   */
  readonly knownFieldSamples?: ReadonlyMap<string, string | number>;
  /**
   * Известные regex-паттерны (как их печатает `z.toJSONSchema` в `pattern`)
   * → валидный образец строки, для полей с ограничением, которое генератор
   * не может вывести сам (например, `^[A-Z][A-Z0-9]+-\d+$` для ключа
   * задачи). Пусто — генератор бросит понятную ошибку с указанием
   * добавить запись сюда (см. `sampleStringForConstraints`).
   */
  readonly knownRegexSamples?: ReadonlyMap<string, string>;
}

interface StringConstraints {
  readonly pattern?: string;
  readonly format?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
}

interface NumberConstraints {
  readonly type?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
}

function lastPathSegment(path: string): string {
  const withoutArraySuffix = path.replace(/\[\]$/, '');
  const segments = withoutArraySuffix.split('.');
  return segments[segments.length - 1] ?? path;
}

function sanitizePathForString(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '_');
}

/** Простой детерминированный хэш path -> положительное число (для числовых полей). */
function hashPathToNumber(path: string): number {
  let hash = 7;
  for (let i = 0; i < path.length; i += 1) {
    hash = (hash * 31 + path.charCodeAt(i)) % 1_000_000;
  }
  return 100_000 + hash;
}

/**
 * Развернуть модификаторы (`optional`/`nullable`/`default`/`prefault`/
 * `readonly`/`nonoptional`) до "голой" схемы значения. Все шесть публично
 * предоставляют `.unwrap()` с одинаковой семантикой (проверено эмпирически
 * на zod 4.3.6 — `ZodDefault`/`ZodPrefault` тоже имеют `.unwrap()`, а не
 * только `.removeDefault()`), поэтому единая проверка через
 * `'unwrap' in schema` вместо перечисления шести классов по отдельности.
 */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  const isWrapper =
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodPrefault ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodNonOptional;

  if (!isWrapper) {
    return schema;
  }

  const withUnwrap = schema as unknown as { unwrap: () => z.ZodTypeAny };
  return unwrap(withUnwrap.unwrap());
}

function sampleStringForConstraints(
  path: string,
  constraints: StringConstraints,
  options: GenerateReachabilitySampleOptions | undefined
): string {
  const knownFieldSample = options?.knownFieldSamples?.get(lastPathSegment(path));
  if (typeof knownFieldSample === 'string') return knownFieldSample;

  if (constraints.format !== undefined) {
    const formatSample = KNOWN_FORMAT_SAMPLES.get(constraints.format);
    if (formatSample !== undefined) return formatSample;
  }

  if (constraints.pattern !== undefined) {
    const knownRegexSample = options?.knownRegexSamples?.get(constraints.pattern);
    if (knownRegexSample !== undefined) return knownRegexSample;
    throw new Error(
      `generateReachabilitySample: нет образца для pattern ${constraints.pattern} на "${path}" — ` +
        'добавь запись в knownRegexSamples (см. GenerateReachabilitySampleOptions)'
    );
  }

  let base = `probe_${sanitizePathForString(path)}`;
  if (typeof constraints.minLength === 'number' && base.length < constraints.minLength) {
    base = base.padEnd(constraints.minLength, 'x');
  }
  if (typeof constraints.maxLength === 'number' && base.length > constraints.maxLength) {
    base = base.slice(0, Math.max(1, constraints.maxLength));
  }
  return base;
}

function sampleNumberForConstraints(
  path: string,
  constraints: NumberConstraints,
  options: GenerateReachabilitySampleOptions | undefined
): number {
  const knownFieldSample = options?.knownFieldSamples?.get(lastPathSegment(path));
  if (typeof knownFieldSample === 'number') return knownFieldSample;

  let value = hashPathToNumber(path);

  const min =
    constraints.exclusiveMinimum !== undefined
      ? constraints.exclusiveMinimum + 1
      : constraints.minimum;
  const max =
    constraints.exclusiveMaximum !== undefined
      ? constraints.exclusiveMaximum - 1
      : constraints.maximum;

  if (typeof min === 'number' && value <= min) {
    value = min + 1;
  }
  if (typeof max === 'number' && value >= max) {
    value = Math.max(typeof min === 'number' ? min : 0, max - 1);
  }

  return constraints.type === 'integer' ? Math.round(value) : value;
}

/** Получить JSON Schema (2020-12) конкретного (уже unwrap-нутого) листа — публичный `z.toJSONSchema`. */
function leafJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  return z.toJSONSchema(schema) as Record<string, unknown>;
}

function generate(
  schema: z.ZodTypeAny,
  path: string,
  leaves: Map<string, ReachabilityLeaf>,
  depth: number,
  options: GenerateReachabilitySampleOptions | undefined
): unknown {
  if (depth > MAX_DEPTH) {
    throw new Error(`generateReachabilitySample: превышена глубина рекурсии на "${path}"`);
  }

  const unwrapped = unwrap(schema);

  if (unwrapped instanceof z.ZodObject) {
    const shape = unwrapped.shape;
    const obj: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      obj[key] = generate(shape[key]!, path ? `${path}.${key}` : key, leaves, depth + 1, options);
    }
    return obj;
  }

  if (unwrapped instanceof z.ZodArray) {
    const element = unwrapped.element as z.ZodTypeAny;
    return [generate(element, `${path}[]`, leaves, depth + 1, options)];
  }

  if (unwrapped instanceof z.ZodRecord) {
    const valueType = unwrapped.valueType as z.ZodTypeAny;
    const key = 'markerKey';
    return {
      [key]: generate(valueType, path ? `${path}.${key}` : key, leaves, depth + 1, options),
    };
  }

  // ZodDiscriminatedUnion — подкласс ZodUnion (проверено эмпирически на zod
  // 4.3.6), поэтому отдельная ветка не нужна: `.options` работает одинаково.
  if (unwrapped instanceof z.ZodUnion) {
    const [first] = unwrapped.options as z.ZodTypeAny[];
    if (first === undefined) {
      throw new Error(`generateReachabilitySample: union без вариантов на "${path}"`);
    }
    return generate(first, path, leaves, depth + 1, options);
  }

  if (unwrapped instanceof z.ZodEnum) {
    const entries = unwrapped.enum as Record<string, string | number>;
    const firstKey = Object.keys(entries)[0];
    if (firstKey === undefined) {
      throw new Error(`generateReachabilitySample: enum без значений на "${path}"`);
    }
    const value = entries[firstKey];
    leaves.set(path, { kind: 'scalar', value: String(value), fieldName: lastPathSegment(path) });
    return value;
  }

  if (unwrapped instanceof z.ZodLiteral) {
    const values = unwrapped.values as Set<unknown>;
    const [value] = values;
    if (typeof value === 'boolean') {
      leaves.set(path, { kind: 'boolean', value: String(value), fieldName: lastPathSegment(path) });
      return value;
    }
    leaves.set(path, { kind: 'scalar', value: String(value), fieldName: lastPathSegment(path) });
    return value;
  }

  if (unwrapped instanceof z.ZodBoolean) {
    // true/false не уникальны сами по себе — ищем пару "имя+значение" (см. ReachabilityLeaf.kind).
    leaves.set(path, { kind: 'boolean', value: 'true', fieldName: lastPathSegment(path) });
    return true;
  }

  if (unwrapped instanceof z.ZodNumber) {
    const constraints = leafJsonSchema(unwrapped) as NumberConstraints;
    const value = sampleNumberForConstraints(path, constraints, options);
    leaves.set(path, { kind: 'scalar', value: String(value), fieldName: lastPathSegment(path) });
    return value;
  }

  if (unwrapped instanceof z.ZodString) {
    const constraints = leafJsonSchema(unwrapped) as StringConstraints;
    const value = sampleStringForConstraints(path, constraints, options);
    leaves.set(path, { kind: 'scalar', value, fieldName: lastPathSegment(path) });
    return value;
  }

  if (unwrapped instanceof z.ZodUnknown || unwrapped instanceof z.ZodAny) {
    const value = `unknown_marker_${sanitizePathForString(path)}`;
    leaves.set(path, { kind: 'scalar', value, fieldName: lastPathSegment(path) });
    return value;
  }

  throw new Error(
    `generateReachabilitySample: неподдерживаемый тип Zod на "${path}" ` +
      `(${unwrapped.constructor.name}) — расширь generate() в generate-reachability-sample.ts`
  );
}

/**
 * Сгенерировать полностью заполненный образец параметров по Zod-объектной
 * схеме — каждое поле (обязательное и опциональное, включая вложенные)
 * получает уникальный узнаваемый маркер, попутно собирается плоская карта
 * `path -> ReachabilityLeaf` для последующей проверки достижимости
 * (см. `check-schema-reachability.ts`).
 */
export function generateReachabilitySample(
  schema: z.ZodTypeAny,
  options?: GenerateReachabilitySampleOptions
): ReachabilitySample {
  const leaves = new Map<string, ReachabilityLeaf>();
  const value = generate(schema, '', leaves, 0, options);
  return { value, leaves };
}
