/**
 * Type guards для улучшения type safety
 */

/**
 * Проверяет что значение является Error объектом
 * @param error - значение для проверки
 * @returns true если error является Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Проверяет что объект имеет статическое свойство METADATA
 * @param obj - объект для проверки
 * @returns true если объект имеет METADATA
 */
export function hasMetadata<T extends { METADATA: unknown }>(obj: unknown): obj is T {
  return typeof obj === 'object' && obj !== null && 'METADATA' in obj && obj.METADATA !== undefined;
}
