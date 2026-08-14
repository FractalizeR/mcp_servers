/**
 * Генератор "полных" тестовых значений для Zod-схем (zod v4 internal `def`).
 *
 * Нужен для DoD пакета 7.1.A: обход реестра инструментов и проверка, что КАЖДОЕ
 * поле входной Zod-схемы реально доезжает до исходящего HTTP-запроса, а не
 * тратится впустую (класс дефектов: "параметр объявлен в схеме, но операция его
 * не отправляет" — обнаружен независимо в Tracker и Wiki серверах, см.
 * .agentic-planning/plan_mcp_2026_modernization/7.1_api_defects_parallel.md).
 *
 * Подход: заполняет ВСЕ поля схемы (обязательные и опциональные) уникальными,
 * легко узнаваемыми маркерами, попутно собирая плоскую карту path -> Leaf для
 * "листьев" (string/number/enum/literal/boolean) — эти маркеры затем ищутся в
 * сериализованном теле/пути исходящего HTTP-запроса. Boolean — особый случай:
 * true/false сами по себе не уникальны, поэтому для них ищется пара "имя+значение"
 * (`"field":true` для JSON-тела или `field=true` для query-строки), а не голое `true`.
 *
 * ВАЖНО: используется приватный `def` zod v4 (не публичный API). Это осознанный
 * компромисс: альтернатива (проход через JSON Schema, сгенерированную
 * generateDefinitionFromSchema) даёт менее точную и менее декларативную
 * реконструкцию regex/min/max ограничений. Если апгрейд zod сломает эту структуру,
 * тест упадёт с понятной ошибкой ("неподдерживаемый тип") — сигнал обновить генератор,
 * а не молчаливая деградация покрытия.
 */

/** Известные regex-паттерны полей проекта -> валидный образец строки. */
const KNOWN_REGEX_SAMPLES: ReadonlyMap<string, string> = new Map([
  ['^[A-Z][A-Z0-9]+-\\d+$', 'TEST-1'], // IssueKeySchema и локальные копии
  ['^[A-Z][A-Z0-9]+$', 'TESTQ'], // ключ очереди (bulk-move/bulk-update)
  ['^[A-Z]{2,10}$', 'TESTQ'], // ключ очереди (create-queue)
]);

/**
 * Известные поля с форматом, который проверяется КОДОМ приложения (не Zod-схемой) —
 * произвольный маркер там бы упал ДО исходящего HTTP-вызова, дав ложное срабатывание
 * теста (поле "не найдено" не потому что потеряно, а потому что запрос вообще не ушёл).
 * Ключ — последний сегмент path (имя поля), не полный путь: одно и то же поле может
 * встречаться в нескольких инструментах (add_worklog/update_worklog).
 */
const KNOWN_FIELD_NAME_SAMPLES: ReadonlyMap<string, string> = new Map([
  // ISO 8601, а не человекочитаемый формат: AddWorklogOperation/UpdateWorklogOperation
  // пропускают уже-ISO значения БЕЗ изменений (DurationUtil.isValidIsoDuration), а
  // человекочитаемые конвертируют перед отправкой — маркер бы не совпал с отправленным.
  ['duration', 'PT1H30M'],
]);

function lastPathSegment(path: string): string {
  const withoutArraySuffix = path.replace(/\[\]$/, '');
  const segments = withoutArraySuffix.split('.');
  return segments[segments.length - 1] ?? path;
}

/** Максимальная глубина рекурсии — защита от неожиданных циклов/lazy-схем. */
const MAX_DEPTH = 12;

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

interface ZodCheckDef {
  readonly check?: string;
  readonly format?: string;
  readonly pattern?: RegExp;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly value?: number;
  readonly inclusive?: boolean;
}

function getCheckDef(check: unknown): ZodCheckDef {
  const zodCheck = check as { _zod?: { def?: ZodCheckDef } };
  return zodCheck._zod?.def ?? {};
}

function findCheck(checks: readonly unknown[] | undefined, name: string): ZodCheckDef | undefined {
  if (!checks) return undefined;
  for (const check of checks) {
    const def = getCheckDef(check);
    if (def.check === name) return def;
  }
  return undefined;
}

function sampleString(path: string, def: { checks?: readonly unknown[] }): string {
  const knownFieldSample = KNOWN_FIELD_NAME_SAMPLES.get(lastPathSegment(path));
  if (knownFieldSample !== undefined) return knownFieldSample;

  const regexCheck = findCheck(def.checks, 'string_format');
  if (regexCheck?.format === 'regex' && regexCheck.pattern) {
    const known = KNOWN_REGEX_SAMPLES.get(regexCheck.pattern.source);
    if (known !== undefined) return known;
    throw new Error(
      `generateSample: нет образца для regex ${regexCheck.pattern.source} на "${path}" — добавь ` +
        'запись в KNOWN_REGEX_SAMPLES (tests/helpers/schema-sample-generator.ts)'
    );
  }

  let base = `probe_${sanitizePathForString(path)}`;
  const minCheck = findCheck(def.checks, 'min_length');
  const maxCheck = findCheck(def.checks, 'max_length');
  if (typeof minCheck?.minimum === 'number' && base.length < minCheck.minimum) {
    base = base.padEnd(minCheck.minimum, 'x');
  }
  if (typeof maxCheck?.maximum === 'number' && base.length > maxCheck.maximum) {
    base = base.slice(0, Math.max(1, maxCheck.maximum));
  }
  return base;
}

function sampleNumber(path: string, def: { checks?: readonly unknown[] }): number {
  let value = hashPathToNumber(path);
  const minCheck = findCheck(def.checks, 'greater_than');
  const maxCheck = findCheck(def.checks, 'less_than');
  if (typeof minCheck?.value === 'number' && value <= minCheck.value) {
    value = minCheck.value + 1;
  }
  if (typeof maxCheck?.value === 'number' && value >= maxCheck.value) {
    value = Math.max(minCheck?.value ?? 0, maxCheck.value - 1);
  }
  const isInt = def.checks?.some((c) => getCheckDef(c).check === 'number_format') ?? false;
  return isInt ? Math.round(value) : value;
}

/**
 * Один "лист" сгенерированного значения:
 * - kind 'scalar' — value ищется как обычная подстрока в сериализованных вызовах
 * - kind 'boolean' — value ИГНОРИРУЕТСЯ; ищется пара `"fieldName":true` (JSON-тело)
 *   ИЛИ `fieldName=true` (query-строка), потому что голое "true" не уникально
 */
export interface Leaf {
  readonly kind: 'scalar' | 'boolean';
  readonly value: string;
  readonly fieldName: string;
}

/**
 * Результат генерации: полностью заполненное значение + карта "листьев"
 * (path -> Leaf), пригодных для поиска в исходящем запросе.
 */
export interface GeneratedSample {
  readonly value: unknown;
  readonly leaves: ReadonlyMap<string, Leaf>;
}

function generate(
  schema: unknown,
  path: string,
  leaves: Map<string, Leaf>,
  depth: number
): unknown {
  if (depth > MAX_DEPTH) {
    throw new Error(`generateSample: превышена глубина рекурсии на "${path}"`);
  }

  const zodSchema = schema as { def?: { type?: string } };
  const def = zodSchema.def;
  if (!def || typeof def.type !== 'string') {
    throw new Error(`generateSample: не удалось определить def.type на "${path}"`);
  }

  switch (def.type) {
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'readonly':
    case 'nonoptional': {
      const inner = (def as { innerType: unknown }).innerType;
      return generate(inner, path, leaves, depth + 1);
    }

    case 'object': {
      const shape = (def as { shape: Record<string, unknown> }).shape;
      const obj: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        obj[key] = generate(shape[key], path ? `${path}.${key}` : key, leaves, depth + 1);
      }
      return obj;
    }

    case 'array': {
      const element = (def as { element: unknown }).element;
      return [generate(element, `${path}[]`, leaves, depth + 1)];
    }

    case 'record': {
      const valueType = (def as { valueType: unknown }).valueType;
      const key = 'markerKey';
      return { [key]: generate(valueType, `${path}.${key}`, leaves, depth + 1) };
    }

    case 'enum': {
      const entries = (def as { entries: Record<string, string | number> }).entries;
      const firstKey = Object.keys(entries)[0];
      if (firstKey === undefined) {
        throw new Error(`generateSample: enum без значений на "${path}"`);
      }
      const value = entries[firstKey];
      leaves.set(path, { kind: 'scalar', value: String(value), fieldName: lastPathSegment(path) });
      return value;
    }

    case 'literal': {
      const values = (def as { values: unknown[] }).values;
      const value = values[0];
      leaves.set(path, { kind: 'scalar', value: String(value), fieldName: lastPathSegment(path) });
      return value;
    }

    case 'union': {
      const options = (def as { options: unknown[] }).options;
      return generate(options[0], path, leaves, depth + 1);
    }

    case 'string': {
      const value = sampleString(path, def as { checks?: readonly unknown[] });
      leaves.set(path, { kind: 'scalar', value, fieldName: lastPathSegment(path) });
      return value;
    }

    case 'number': {
      const value = sampleNumber(path, def as { checks?: readonly unknown[] });
      leaves.set(path, { kind: 'scalar', value: String(value), fieldName: lastPathSegment(path) });
      return value;
    }

    case 'boolean':
      // true/false не уникальны сами по себе — ищем пару "имя+значение" (см. Leaf.kind)
      leaves.set(path, { kind: 'boolean', value: 'true', fieldName: lastPathSegment(path) });
      return true;

    case 'unknown':
    case 'any': {
      const value = `unknown_marker_${sanitizePathForString(path)}`;
      leaves.set(path, { kind: 'scalar', value, fieldName: lastPathSegment(path) });
      return value;
    }

    default:
      throw new Error(
        `generateSample: неподдерживаемый тип zod def.type="${def.type}" на "${path}" — ` +
          'расширь generateSample (tests/helpers/schema-sample-generator.ts)'
      );
  }
}

/**
 * Генерирует полностью заполненный образец параметров по Zod-объектной схеме.
 *
 * @param schema - корневая Zod-схема (обычно `z.object({...})`, включая обёрнутую
 *   `.refine()`/`.superRefine()` — они не меняют `def.type`, поэтому не требуют
 *   отдельной обработки)
 */
export function generateSample(schema: unknown): GeneratedSample {
  const leaves = new Map<string, Leaf>();
  const value = generate(schema, '', leaves, 0);
  return { value, leaves };
}
