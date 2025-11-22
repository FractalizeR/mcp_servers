/**
 * Валидация уникальности имён классов для DI регистрации
 *
 * Защита от коллизий имён в Dependency Injection системе:
 * - Проверяет уникальность имён классов Tools и Operations
 * - Обнаруживает дубликаты до запуска приложения
 * - Предотвращает silent failures в DI контейнере
 */

import { TOOL_CLASSES } from './definitions/tool-definitions.js';
import { OPERATION_CLASSES } from './definitions/operation-definitions.js';

/**
 * Валидация уникальности имён классов
 *
 * @param classes - Массив классов для проверки
 * @param type - Тип класса ('Tool' или 'Operation') для сообщения об ошибке
 * @throws {Error} Если найдены дубликаты имён
 */
export function validateUniqueClassNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classes: ReadonlyArray<new (...args: any[]) => any>,
  type: 'Tool' | 'Operation'
): void {
  const names = new Set<string>();
  const duplicates: string[] = [];

  for (const ClassDef of classes) {
    const name = ClassDef.name;
    if (names.has(name)) {
      duplicates.push(name);
    }
    names.add(name);
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate ${type} class names detected: ${duplicates.join(', ')}. ` +
        `Each ${type} must have a unique name for DI registration.`
    );
  }
}

/**
 * Валидация всех DI регистраций
 *
 * Вызывается при создании контейнера для проверки уникальности
 * имён всех Tools и Operations.
 *
 * @throws {Error} Если найдены дубликаты имён в Tools или Operations
 */
export function validateDIRegistrations(): void {
  validateUniqueClassNames(TOOL_CLASSES, 'Tool');
  validateUniqueClassNames(OPERATION_CLASSES, 'Operation');
}
