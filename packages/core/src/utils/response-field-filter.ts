/**
 * Утилита для фильтрации полей в API ответах
 *
 * Ответственность (SRP):
 * - Фильтрация объектов по заданному списку полей
 * - Поддержка вложенных полей через dot-notation (например: "assignee.login")
 * - Обработка массивов объектов
 * - Сохранение типобезопасности
 */
export class ResponseFieldFilter {
  /**
   * Фильтрует объект, оставляя только указанные поля
   *
   * @param data - Исходные данные (объект или массив объектов)
   * @param fields - Массив путей к полям (поддерживается dot-notation). ОБЯЗАТЕЛЕН и должен содержать минимум 1 элемент
   * @returns Отфильтрованные данные с теми же типами
   *
   * @example
   * // Получение конкретных вложенных полей
   * const data = { key: 'QUEUE-1', summary: 'Test', assignee: { login: 'user', email: 'user@example.com' } };
   * const filtered1 = ResponseFieldFilter.filter(data, ['key', 'assignee.login']);
   * // Result: { key: 'QUEUE-1', assignee: { login: 'user' } }
   *
   * // Получение всего вложенного объекта
   * const filtered2 = ResponseFieldFilter.filter(data, ['key', 'assignee']);
   * // Result: { key: 'QUEUE-1', assignee: { login: 'user', email: 'user@example.com' } }
   */
  static filter<T>(data: T, fields: string[]): T {
    // Валидация: fields должен содержать минимум 1 элемент
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!fields || fields.length === 0) {
      throw new Error('Параметр fields обязателен и должен содержать хотя бы один элемент');
    }

    // Обработка массивов
    if (Array.isArray(data)) {
      return data.map((item) => this.filterObject(item, fields)) as T;
    }

    // Обработка объектов
    if (typeof data === 'object' && data !== null) {
      return this.filterObject(data, fields) as T;
    }

    // Примитивы возвращаем как есть
    return data;
  }

  /**
   * Фильтрует один объект по списку полей
   *
   * @param obj - Исходный объект
   * @param fields - Массив путей к полям
   * @returns Новый объект только с указанными полями
   */
  private static filterObject(obj: unknown, fields: string[]): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result: Record<string, unknown> = {};

    for (const fieldPath of fields) {
      const pathParts = fieldPath.split('.');
      this.extractField(obj as Record<string, unknown>, pathParts, result);
    }

    return result;
  }

  /**
   * Извлекает поле из исходного объекта и помещает в результирующий
   *
   * @param source - Исходный объект
   * @param pathParts - Путь к полю (разбитый на части)
   * @param target - Результирующий объект
   */
  private static extractField(
    source: Record<string, unknown>,
    pathParts: string[],
    target: Record<string, unknown>
  ): void {
    if (pathParts.length === 0) {
      return;
    }

    const currentKey: string | undefined = pathParts[0];
    const remainingPath: string[] = pathParts.slice(1);

    // Проверка на undefined (должно быть невозможно из-за проверки length > 0, но TypeScript требует явную проверку)
    if (!currentKey) {
      return;
    }

    // Проверяем наличие поля в исходном объекте
    if (!(currentKey in source)) {
      return;
    }

    // Если это последняя часть пути, копируем значение напрямую
    // Это работает и для примитивов, и для вложенных объектов (копируется ссылка, что нормально)
    if (remainingPath.length === 0) {
      target[currentKey] = source[currentKey];
      return;
    }

    // Обработка вложенных полей
    const sourceValue: unknown = source[currentKey];

    if (typeof sourceValue === 'object' && sourceValue !== null) {
      // Если целевой объект еще не существует, создаём его
      if (!(currentKey in target) || typeof target[currentKey] !== 'object') {
        target[currentKey] = {};
      }

      // Рекурсивно извлекаем вложенное поле
      this.extractField(
        sourceValue as Record<string, unknown>,
        remainingPath,
        target[currentKey] as Record<string, unknown>
      );
    }
  }

  /**
   * Нормализует список полей, удаляя дубликаты и сортируя
   *
   * @param fields - Исходный массив полей
   * @returns Нормализованный массив (никогда не пустой)
   * @throws Error если после нормализации массив пустой
   */
  static normalizeFields(fields: string[]): string[] {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!fields || fields.length === 0) {
      throw new Error('Параметр fields обязателен и должен содержать хотя бы один элемент');
    }

    // Удаляем дубликаты, пустые строки и сортируем
    const uniqueFields = Array.from(new Set(fields))
      .filter((field) => field.trim().length > 0)
      .map((field) => field.trim())
      .sort();

    if (uniqueFields.length === 0) {
      throw new Error('После нормализации массив полей пуст (все элементы были пустыми строками)');
    }

    return uniqueFields;
  }

  /**
   * Валидирует формат путей к полям
   *
   * @param fields - Массив полей для валидации (должен быть не пустым)
   * @returns Ошибка валидации или undefined
   */
  static validateFields(fields: string[]): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!fields || fields.length === 0) {
      return 'Параметр fields обязателен и должен содержать хотя бы один элемент';
    }

    for (const field of fields) {
      // Проверка на пустоту
      if (field.trim().length === 0) {
        return 'Поле не может быть пустой строкой';
      }

      // Проверка формата (буквы, цифры, подчёркивания, точки)
      if (!/^[a-zA-Z0-9_.]+$/.test(field)) {
        return `Недопустимый формат поля: "${field}". Разрешены только буквы, цифры, подчёркивания и точки`;
      }

      // Проверка на двойные точки
      if (field.includes('..')) {
        return `Недопустимый формат поля: "${field}". Двойные точки не разрешены`;
      }

      // Проверка на точку в начале/конце
      if (field.startsWith('.') || field.endsWith('.')) {
        return `Недопустимый формат поля: "${field}". Поле не может начинаться или заканчиваться точкой`;
      }
    }

    return undefined;
  }
}
