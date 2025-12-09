/**
 * Утилита для фильтрации полей в API ответах
 *
 * Ответственность (SRP):
 * - Фильтрация объектов по заданному списку полей
 * - Поддержка вложенных полей через dot-notation (например: "assignee.login")
 * - Поддержка фильтрации внутри вложенных массивов (например: "fields.field.display")
 * - Обработка массивов объектов на верхнем уровне
 * - Сохранение типобезопасности
 */
const FIELDS_REQUIRED_ERROR = 'Параметр fields обязателен и должен содержать хотя бы один элемент';

export class ResponseFieldFilter {
  /**
   * Фильтрует объект, оставляя только указанные поля
   *
   * @param data - Исходные данные (объект или массив объектов)
   * @param fields - Массив путей к полям (поддерживается dot-notation). ОБЯЗАТЕЛЕН и должен содержать минимум 1 элемент
   * @returns Отфильтрованные данные с теми же типами
   *
   * @example
   * // Получение конкретных вложенных полей из объекта
   * const data = { key: 'QUEUE-1', summary: 'Test', assignee: { login: 'user', email: 'user@example.com' } };
   * const filtered1 = ResponseFieldFilter.filter(data, ['key', 'assignee.login']);
   * // Result: { key: 'QUEUE-1', assignee: { login: 'user' } }
   *
   * // Получение всего вложенного объекта
   * const filtered2 = ResponseFieldFilter.filter(data, ['key', 'assignee']);
   * // Result: { key: 'QUEUE-1', assignee: { login: 'user', email: 'user@example.com' } }
   *
   * @example
   * // Фильтрация внутри вложенных массивов (например, changelog.fields)
   * const changelog = {
   *   updatedAt: '2024-01-01',
   *   fields: [
   *     { field: { id: 'status', display: 'Status' }, from: { key: 'open' }, to: { key: 'closed' } }
   *   ]
   * };
   * const filtered = ResponseFieldFilter.filter(changelog, ['updatedAt', 'fields.field.display', 'fields.to.key']);
   * // Result: { updatedAt: '2024-01-01', fields: [{ field: { display: 'Status' }, to: { key: 'closed' } }] }
   */
  static filter<T>(data: T, fields: string[] | undefined | null): T {
    // Валидация: fields должен содержать минимум 1 элемент
    if (!fields || fields.length === 0) {
      throw new Error(FIELDS_REQUIRED_ERROR);
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
   * Поддерживает:
   * - Вложенные объекты: "assignee.login" → { assignee: { login: "..." } }
   * - Массивы объектов: "fields.field.display" → { fields: [{ field: { display: "..." } }] }
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
      // Обработка массивов: применяем оставшийся путь к каждому элементу
      if (Array.isArray(sourceValue)) {
        const filteredArray = this.filterArrayElements(sourceValue, remainingPath);

        // Если массив уже существует в target, мержим результаты
        if (currentKey in target && Array.isArray(target[currentKey])) {
          target[currentKey] = this.mergeArrayResults(
            target[currentKey] as unknown[],
            filteredArray
          );
        } else {
          target[currentKey] = filteredArray;
        }
        return;
      }

      // Обработка объектов
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
   * Фильтрует элементы массива, применяя оставшийся путь к каждому элементу
   *
   * @param array - Исходный массив
   * @param remainingPath - Оставшийся путь (после имени массива)
   * @returns Отфильтрованный массив
   *
   * @example
   * // Вход: [{ field: { id: 'status', display: 'Status' }, from: {...}, to: {...} }]
   * // remainingPath: ['field', 'display']
   * // Выход: [{ field: { display: 'Status' } }]
   */
  private static filterArrayElements(array: unknown[], remainingPath: string[]): unknown[] {
    return array.map((item) => {
      // Примитивы возвращаем как есть
      if (typeof item !== 'object' || item === null) {
        return item;
      }

      // Для объектов применяем фильтрацию по оставшемуся пути
      const result: Record<string, unknown> = {};
      this.extractField(item as Record<string, unknown>, remainingPath, result);
      return result;
    });
  }

  /**
   * Мержит два массива результатов фильтрации (поэлементно).
   * Используется когда несколько полей запрашивают данные из одного массива.
   *
   * @param existing - Уже накопленные результаты
   * @param newResults - Новые результаты для мержа
   * @returns Объединённый массив
   *
   * @example
   * // existing: [{ field: { display: 'Status' } }]
   * // newResults: [{ from: { display: 'Open' } }]
   * // result: [{ field: { display: 'Status' }, from: { display: 'Open' } }]
   */
  private static mergeArrayResults(existing: unknown[], newResults: unknown[]): unknown[] {
    // Массивы должны иметь одинаковую длину (они из одного исходного массива)
    const maxLength = Math.max(existing.length, newResults.length);
    const result: unknown[] = [];

    for (let i = 0; i < maxLength; i++) {
      const existingItem = existing[i];
      const newItem = newResults[i];

      // Если один из элементов отсутствует, используем другой
      if (existingItem === undefined) {
        result.push(newItem);
        continue;
      }
      if (newItem === undefined) {
        result.push(existingItem);
        continue;
      }

      // Если оба примитивы или null — используем существующий
      if (
        typeof existingItem !== 'object' ||
        existingItem === null ||
        typeof newItem !== 'object' ||
        newItem === null
      ) {
        result.push(existingItem);
        continue;
      }

      // Глубокий мерж двух объектов
      result.push(this.deepMerge(existingItem, newItem));
    }

    return result;
  }

  /**
   * Глубоко мержит два объекта
   *
   * @param target - Целевой объект
   * @param source - Исходный объект для мержа
   * @returns Новый объект с объединёнными полями
   */
  private static deepMerge(target: unknown, source: unknown): unknown {
    if (
      typeof target !== 'object' ||
      target === null ||
      typeof source !== 'object' ||
      source === null
    ) {
      return target;
    }

    const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    const sourceObj = source as Record<string, unknown>;

    for (const key of Object.keys(sourceObj)) {
      if (key in result) {
        // Если оба значения - объекты, мержим рекурсивно
        if (
          typeof result[key] === 'object' &&
          result[key] !== null &&
          typeof sourceObj[key] === 'object' &&
          sourceObj[key] !== null &&
          !Array.isArray(result[key]) &&
          !Array.isArray(sourceObj[key])
        ) {
          result[key] = this.deepMerge(result[key], sourceObj[key]);
        }
        // Иначе оставляем существующее значение (не перезаписываем)
      } else {
        // Добавляем новое поле
        result[key] = sourceObj[key];
      }
    }

    return result;
  }

  /**
   * Нормализует список полей, удаляя дубликаты и сортируя
   *
   * @param fields - Исходный массив полей
   * @returns Нормализованный массив (никогда не пустой)
   * @throws Error если после нормализации массив пустой
   */
  static normalizeFields(fields: string[] | undefined | null): string[] {
    if (!fields || fields.length === 0) {
      throw new Error(FIELDS_REQUIRED_ERROR);
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
  static validateFields(fields: string[] | undefined | null): string | undefined {
    if (!fields || fields.length === 0) {
      return FIELDS_REQUIRED_ERROR;
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
