/**
 * Redaction параметров вызова инструмента перед логированием
 *
 * Проблема: `ToolRegistry.execute()` логировал `params` как есть
 * (`logger.debug('Параметры вызова:', params)`). В файловый лог утекали
 * тексты комментариев, содержимое страниц Wiki и любые другие произвольные
 * пользовательские данные, переданные модели агентом.
 *
 * Решение: в лог попадает ФОРМА вызова — имена ключей, типы значений,
 * размеры (длина строки/массива, число ключей объекта), а не содержимое.
 * Значение конкретного параметра логируется «как есть» только если его имя
 * явно присутствует в allow-list (по умолчанию allow-list пуст — ни одно
 * значение не логируется).
 *
 * Границы, которые редактор обязан соблюдать сам:
 * - Глубина рекурсии ограничена ({@link DEFAULT_MAX_DEPTH}) — за пределами
 *   лимита форма вложенной структуры не раскрывается.
 * - Число ключей объекта и элементов массива, обрабатываемых индивидуально
 *   на одном уровне, ограничено ({@link DEFAULT_MAX_KEYS} /
 *   {@link DEFAULT_MAX_ARRAY_ITEMS}) — на очень больших payload редактор не
 *   должен сам стать источником нагрузки.
 * - Циклические ссылки (объект/массив ссылается сам на себя через цепочку
 *   предков) обнаруживаются и не приводят к бесконечной рекурсии.
 * - Строка заменяется на маркер С ДЛИНОЙ (`{ type: 'string', length }`),
 *   а не на префикс исходного значения: префикс секрета — тоже секрет.
 */

/** Максимальная глубина рекурсии по умолчанию */
const DEFAULT_MAX_DEPTH = 4;
/** Максимальное число ключей объекта, обрабатываемых на одном уровне */
const DEFAULT_MAX_KEYS = 50;
/** Максимальное число элементов массива, обрабатываемых индивидуально */
const DEFAULT_MAX_ARRAY_ITEMS = 10;
/** Максимальная длина значения, раскрываемого для allow-listed строкового параметра */
const MAX_ALLOWED_VALUE_LENGTH = 500;

/**
 * Опции редактора
 */
export interface RedactorOptions {
  /**
   * Имена параметров, чьё значение разрешено логировать как есть.
   *
   * Проверяется по имени ключа на ЛЮБОМ уровне вложенности (не только у
   * параметров верхнего уровня вызова) — например, `queue` внутри вложенного
   * объекта так же безопасен для отладки, как и `queue` на верхнем уровне.
   *
   * По умолчанию пуст: ни одно значение не логируется, пока явно не
   * разрешено.
   */
  allowedKeys?: readonly string[];
  /** Максимальная глубина рекурсии (по умолчанию {@link DEFAULT_MAX_DEPTH}) */
  maxDepth?: number;
  /** Максимальное число ключей объекта на уровне (по умолчанию {@link DEFAULT_MAX_KEYS}) */
  maxKeys?: number;
  /** Максимальное число элементов массива на уровне (по умолчанию {@link DEFAULT_MAX_ARRAY_ITEMS}) */
  maxArrayItems?: number;
}

interface RedactionLimits {
  readonly maxDepth: number;
  readonly maxKeys: number;
  readonly maxArrayItems: number;
  /** Полный allow-list имён (для проверки вложенных ключей на любой глубине) */
  readonly allowedKeys: ReadonlySet<string>;
  /** Цепочка предков текущего пути рекурсии — для обнаружения циклов */
  readonly ancestors: Set<object>;
}

/**
 * Редактирует параметры вызова инструмента для безопасного логирования.
 *
 * @param params - параметры вызова, как они пришли в tools/call
 * @param options - allow-list имён параметров и лимиты глубины/размера
 * @returns объект с сохранёнными именами ключей верхнего уровня, где каждое
 *   значение заменено либо на описание формы (тип, длина/размер), либо —
 *   для allow-listed примитивов — на само значение (с ограничением длины).
 */
export function redactParams(
  params: Record<string, unknown>,
  options: RedactorOptions = {}
): Record<string, unknown> {
  const allowedKeys = new Set(options.allowedKeys ?? []);
  const limits: RedactionLimits = {
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxKeys: options.maxKeys ?? DEFAULT_MAX_KEYS,
    maxArrayItems: options.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS,
    allowedKeys,
    ancestors: new Set<object>(),
  };

  const keys = Object.keys(params);
  const limitedKeys = keys.slice(0, limits.maxKeys);

  const result: Record<string, unknown> = {};
  for (const key of limitedKeys) {
    result[key] = redactValue(params[key], allowedKeys.has(key), 1, limits);
  }
  if (keys.length > limits.maxKeys) {
    result['__truncatedKeys'] = keys.length - limits.maxKeys;
  }

  return result;
}

/**
 * Редактирует одно значение.
 *
 * @param value - значение параметра (или элемента вложенной структуры)
 * @param isAllowed - разрешено ли раскрывать ИМЕННО это значение как есть
 *   (вычисляется вызывающим кодом по имени ключа, которому это значение
 *   принадлежит; у элементов массива своего имени нет, поэтому они сами
 *   никогда не allow-listed — только их собственные вложенные поля)
 * @param depth - текущая глубина рекурсии
 * @param limits - лимиты редактора (включая allow-list для вложенных ключей)
 */
function redactValue(
  value: unknown,
  isAllowed: boolean,
  depth: number,
  limits: RedactionLimits
): unknown {
  if (value === undefined) {
    return { type: 'undefined' };
  }
  if (value === null) {
    return { type: 'null' };
  }

  const valueType = typeof value;

  if (valueType === 'string') {
    return redactString(value as string, isAllowed);
  }

  if (valueType === 'number' || valueType === 'boolean') {
    return isAllowed ? value : { type: valueType };
  }

  if (valueType === 'bigint' || valueType === 'symbol' || valueType === 'function') {
    return { type: valueType };
  }

  // valueType === 'object' здесь: Array, Date, plain object и т.п.
  return redactObjectLike(value as object, depth, limits);
}

/** Редактирует строковое значение: маркер с длиной, либо (если allow-listed) само значение, с ограничением длины */
function redactString(value: string, isAllowed: boolean): unknown {
  if (!isAllowed) {
    return { type: 'string', length: value.length };
  }
  if (value.length <= MAX_ALLOWED_VALUE_LENGTH) {
    return value;
  }
  // Даже allow-listed значение не раскрывается полностью, если оно
  // подозрительно длинное для «идентификатора» — редактор не должен
  // стать каналом утечки большого содержимого через ошибочно широкий
  // allow-list.
  return {
    value: `${value.slice(0, MAX_ALLOWED_VALUE_LENGTH)}…`,
    length: value.length,
    truncated: true,
  };
}

/** Редактирует Array/Date/plain object с защитой от циклов и переполнения */
function redactObjectLike(value: object, depth: number, limits: RedactionLimits): unknown {
  if (value instanceof Date) {
    return { type: 'date' };
  }

  if (limits.ancestors.has(value)) {
    return { type: 'circular' };
  }

  if (depth > limits.maxDepth) {
    return { type: Array.isArray(value) ? 'array' : 'object', truncated: 'max-depth' };
  }

  limits.ancestors.add(value);
  try {
    return Array.isArray(value)
      ? redactArray(value, depth, limits)
      : redactPlainObject(value as Record<string, unknown>, depth, limits);
  } finally {
    limits.ancestors.delete(value);
  }
}

function redactArray(
  value: unknown[],
  depth: number,
  limits: RedactionLimits
): Record<string, unknown> {
  const itemsToProcess = value.slice(0, limits.maxArrayItems);
  const items = itemsToProcess.map((item) =>
    // элементы массива сами по себе не именованы -> не allow-listed напрямую,
    // но их собственные вложенные поля (если это объекты) проверяются по имени
    redactValue(item, false, depth + 1, limits)
  );

  const shape: Record<string, unknown> = { type: 'array', length: value.length, items };
  if (value.length > limits.maxArrayItems) {
    shape['truncatedItems'] = value.length - limits.maxArrayItems;
  }
  return shape;
}

function redactPlainObject(
  value: Record<string, unknown>,
  depth: number,
  limits: RedactionLimits
): Record<string, unknown> {
  const keys = Object.keys(value);
  const limitedKeys = keys.slice(0, limits.maxKeys);

  const properties: Record<string, unknown> = {};
  for (const key of limitedKeys) {
    properties[key] = redactValue(value[key], limits.allowedKeys.has(key), depth + 1, limits);
  }

  const shape: Record<string, unknown> = { type: 'object', properties };
  if (keys.length > limits.maxKeys) {
    shape['truncatedKeys'] = keys.length - limits.maxKeys;
  }
  return shape;
}
