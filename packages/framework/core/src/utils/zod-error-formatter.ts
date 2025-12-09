/**
 * Централизованный форматтер ошибок Zod
 *
 * Преобразует стандартные коды ошибок Zod в стабильные,
 * контролируемые сообщения, независимые от версии Zod.
 *
 * Совместим с Zod v3.x и v4.x
 */

/**
 * Минимальный интерфейс ZodIssue для совместимости между версиями Zod
 *
 * Определяет только обязательные поля, которые есть в любом ZodIssue.
 * Дополнительные поля (expected, received, minimum, etc.) извлекаются
 * через getField() helper с unsafe cast.
 */
export interface ZodIssueMinimal {
  readonly code: string;
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/**
 * Стабильные коды ошибок валидации (наши, не Zod)
 */
export const ValidationErrorCode = {
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_ENUM: 'INVALID_ENUM',
  TOO_SMALL: 'TOO_SMALL',
  TOO_BIG: 'TOO_BIG',
  INVALID_STRING: 'INVALID_STRING',
  REQUIRED: 'REQUIRED',
  CUSTOM: 'CUSTOM',
  UNKNOWN: 'UNKNOWN',
} as const;

 
export type ValidationErrorCode = (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];

/**
 * Результат форматирования одной ошибки
 */
export interface FormattedValidationError {
  code: ValidationErrorCode;
  message: string;
  path: string;
}

/**
 * Маппинг Zod issue code → наш код
 */
const ZOD_CODE_MAP: Record<string, ValidationErrorCode> = {
  invalid_type: ValidationErrorCode.INVALID_TYPE,
  invalid_enum_value: ValidationErrorCode.INVALID_ENUM,
  invalid_value: ValidationErrorCode.INVALID_ENUM, // Zod 4 alias
  too_small: ValidationErrorCode.TOO_SMALL,
  too_big: ValidationErrorCode.TOO_BIG,
  invalid_string: ValidationErrorCode.INVALID_STRING,
  invalid_format: ValidationErrorCode.INVALID_STRING, // Zod 4
  invalid_union: ValidationErrorCode.INVALID_TYPE,
  invalid_literal: ValidationErrorCode.INVALID_TYPE,
  custom: ValidationErrorCode.CUSTOM,
};

/**
 * Контекст для форматирования сообщений
 */
interface IssueContext {
  path: string;
  expected: string | undefined;
  received: string | undefined;
  minimum: number | undefined;
  maximum: number | undefined;
  inclusive: boolean;
  validation: string | undefined;
  zodType: string | undefined;
  origin: string | undefined;
  message: string;
}

/**
 * Безопасное получение поля из issue
 */
function getField<T>(issue: Record<string, unknown>, field: string): T | undefined {
  return issue[field] as T | undefined;
}

/**
 * Извлекает контекст из ZodIssue
 */
function extractContext(issue: ZodIssueMinimal): IssueContext {
  const issueRecord = issue as unknown as Record<string, unknown>;
  return {
    path: issue.path.map(String).join('.'),
    expected: getField<string>(issueRecord, 'expected'),
    received: getField<string>(issueRecord, 'received'),
    minimum: getField<number>(issueRecord, 'minimum'),
    maximum: getField<number>(issueRecord, 'maximum'),
    inclusive: getField<boolean>(issueRecord, 'inclusive') ?? true,
    validation: getField<string>(issueRecord, 'validation'),
    zodType: getField<string>(issueRecord, 'type'),
    origin: getField<string>(issueRecord, 'origin'),
    message: issue.message,
  };
}

/** Форматирует invalid_type */
function formatInvalidType(ctx: IssueContext): string {
  const { path, expected, received } = ctx;
  if (received === 'undefined') {
    return path ? `Поле '${path}' обязательно` : 'Обязательное поле не указано';
  }
  if (expected === 'integer' || expected === 'int') {
    return path ? `Поле '${path}': ожидается целое число` : 'Ожидается целое число';
  }
  return path
    ? `Поле '${path}': ожидается ${expected}, получено ${received}`
    : `Ожидается ${expected}, получено ${received}`;
}

/** Форматирует invalid_enum_value */
function formatInvalidEnum(ctx: IssueContext): string {
  const { path, received } = ctx;
  return path
    ? `Поле '${path}': недопустимое значение '${String(received)}'`
    : `Недопустимое значение '${String(received)}'`;
}

/** Возвращает слово в правильной форме для числа */
function pluralize(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/** Форматирует too_small */
function formatTooSmall(ctx: IssueContext): string {
  const { path, minimum, inclusive, zodType, origin } = ctx;
  const min = minimum ?? 0;
  const isArray = zodType === 'array' || origin === 'array';
  const isString = zodType === 'string' || origin === 'string';

  if (isArray) {
    const word = pluralize(min, 'элемент', 'элемента', 'элементов');
    return path ? `Поле '${path}': минимум ${min} ${word}` : `Минимум ${min} ${word}`;
  }
  if (isString) {
    const word = pluralize(min, 'символ', 'символа', 'символов');
    return path ? `Поле '${path}': минимум ${min} ${word}` : `Минимум ${min} ${word}`;
  }
  const cmp = inclusive ? '>=' : '>';
  return path
    ? `Поле '${path}': значение должно быть ${cmp} ${min}`
    : `Значение должно быть ${cmp} ${min}`;
}

/** Форматирует too_big */
function formatTooBig(ctx: IssueContext): string {
  const { path, maximum, inclusive } = ctx;
  const max = maximum ?? 0;
  const cmp = inclusive ? '<=' : '<';
  return path
    ? `Поле '${path}': значение должно быть ${cmp} ${max}`
    : `Значение должно быть ${cmp} ${max}`;
}

/** Форматирует invalid_string */
function formatInvalidString(ctx: IssueContext): string {
  const { path, validation } = ctx;
  if (validation) {
    return path
      ? `Поле '${path}': неверный формат (${validation})`
      : `Неверный формат (${validation})`;
  }
  return path ? `Поле '${path}': неверный формат строки` : 'Неверный формат строки';
}

/** Форматирует неизвестный код ошибки */
function formatDefault(ctx: IssueContext): string {
  const { path, message } = ctx;
  return path ? `Поле '${path}': ${message}` : message;
}

/** Маппинг кодов на форматтеры */
const CODE_FORMATTERS: Record<string, (ctx: IssueContext) => string> = {
  invalid_type: formatInvalidType,
  invalid_enum_value: formatInvalidEnum,
  invalid_value: formatInvalidEnum,
  too_small: formatTooSmall,
  too_big: formatTooBig,
  invalid_string: formatInvalidString,
  invalid_format: formatInvalidString,
};

/**
 * Форматирует одну ошибку Zod в стабильное сообщение
 */
function formatIssue(issue: ZodIssueMinimal): FormattedValidationError {
  const issueCode = String(issue.code);
  const code = ZOD_CODE_MAP[issueCode] ?? ValidationErrorCode.UNKNOWN;
  const ctx = extractContext(issue);
  const formatter = CODE_FORMATTERS[issueCode] ?? formatDefault;
  const message = formatter(ctx);
  return { code, message, path: ctx.path };
}

/**
 * Форматирует массив ошибок Zod в стабильные сообщения
 *
 * @param issues - массив ZodIssue из ZodError.issues (совместим с Zod v3 и v4)
 * @returns массив отформатированных ошибок
 */
export function formatZodErrors(issues: readonly ZodIssueMinimal[]): FormattedValidationError[] {
  return issues.map(formatIssue);
}

/**
 * Форматирует массив ошибок Zod в строку для отображения
 *
 * @param issues - массив ZodIssue из ZodError.issues (совместим с Zod v3 и v4)
 * @param separator - разделитель между ошибками (по умолчанию '; ')
 * @returns строка с объединёнными сообщениями
 */
export function formatZodErrorsToString(
  issues: readonly ZodIssueMinimal[],
  separator = '; '
): string {
  return formatZodErrors(issues)
    .map((e) => e.message)
    .join(separator);
}
