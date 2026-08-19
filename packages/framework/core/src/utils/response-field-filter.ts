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
      return data.map((item) => this.compact(this.filterObject(item, fields))) as T;
    }

    // Обработка объектов
    if (typeof data === 'object' && data !== null) {
      return this.compact(this.filterObject(data, fields)) as T;
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
   * @returns true, если в target было записано хотя бы одно значение (напрямую или рекурсивно).
   *   Используется вызывающим кодом, чтобы не создавать пустые объекты-обёртки для путей,
   *   которые ничего не извлекли (например "assignee.nonExistent" или "to.display", когда
   *   поля display в "to" нет). Обратите внимание: пустое значение, которое ДЕЙСТВИТЕЛЬНО
   *   пришло из API (null, {}, []), всегда считается "извлечённым" — оно копируется веткой
   *   remainingPath.length === 0 и возвращает true.
   */
  private static extractField(
    source: Record<string, unknown>,
    pathParts: string[],
    target: Record<string, unknown>
  ): boolean {
    if (pathParts.length === 0) {
      return false;
    }

    const currentKey: string | undefined = pathParts[0];
    const remainingPath: string[] = pathParts.slice(1);

    // Проверка на undefined (должно быть невозможно из-за проверки length > 0, но TypeScript требует явную проверку)
    if (!currentKey) {
      return false;
    }

    // Проверяем наличие поля в исходном объекте
    if (!(currentKey in source)) {
      return false;
    }

    // Если это последняя часть пути, копируем значение напрямую
    // Это работает и для примитивов, и для вложенных объектов (копируется ссылка, что нормально).
    // Значение считается извлечённым, даже если оно null/{}/[] — это законный ответ API,
    // а не "мусор" от неудачной проекции.
    if (remainingPath.length === 0) {
      target[currentKey] = source[currentKey];
      return true;
    }

    // Обработка вложенных полей
    const sourceValue: unknown = source[currentKey];

    if (typeof sourceValue === 'object' && sourceValue !== null) {
      // Обработка массивов: применяем оставшийся путь к каждому элементу
      if (Array.isArray(sourceValue)) {
        const filteredArray = this.filterArrayElements(sourceValue, remainingPath);

        // Находка 4 (внешнее ревью): раньше эта ветка возвращала true безусловно, поэтому
        // путь, не извлёкший ничего НИ В ОДНОМ элементе массива (например
        // "fields.field.display", когда ни у одного элемента fields нет field.display),
        // всё равно оставлял в результате пустышку "fields": [] — тот же шум с пустыми
        // обёртками, ради устранения которого и существует этот метод, только на уровень
        // глубже. Пустой ИСХОДНЫЙ массив (sourceValue.length === 0) — это законные данные
        // API ("тегов нет") и всегда считается извлечённым; непустой исходный массив
        // считается извлечённым только если хотя бы один элемент дал результат.
        const extractedSomething =
          sourceValue.length === 0 || filteredArray.some((item) => item !== undefined);

        if (!extractedSomething) {
          return false;
        }

        // Если массив уже существует в target, мержим результаты
        if (currentKey in target && Array.isArray(target[currentKey])) {
          target[currentKey] = this.mergeArrayResults(
            target[currentKey] as unknown[],
            filteredArray
          );
        } else {
          target[currentKey] = filteredArray;
        }
        return true;
      }

      // Обработка объектов: пишем во временный объект и переносим его в target
      // только если что-то реально извлеклось — иначе не создаём пустую обёртку "{}".
      const existingNested =
        currentKey in target &&
        typeof target[currentKey] === 'object' &&
        !Array.isArray(target[currentKey])
          ? (target[currentKey] as Record<string, unknown>)
          : undefined;
      const nestedTarget: Record<string, unknown> = existingNested ?? {};

      const wrote = this.extractField(
        sourceValue as Record<string, unknown>,
        remainingPath,
        nestedTarget
      );

      if (wrote) {
        target[currentKey] = nestedTarget;
      }

      return wrote;
    }

    // sourceValue существует, но не является объектом (примитив), а путь ещё не закончен —
    // извлекать больше нечего.
    return false;
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
   *
   * Элемент, для которого проекция не извлекла ни одного поля (например, у элемента нет
   * запрошенного вложенного поля), помечается служебным маркером `undefined`, а не `{}` —
   * иначе именно такие пустые объекты и засоряют контекст ("to": [{}, {}, {}]). Маркер
   * `undefined` сохраняет позиционное соответствие индексов, необходимое mergeArrayResults
   * при объединении проекций нескольких полей одного массива, и удаляется позже методом
   * {@link compact} — уже после того, как все проекции для этого массива смержены.
   */
  private static filterArrayElements(array: unknown[], remainingPath: string[]): unknown[] {
    return array.map((item) => {
      // Примитивы (включая null) возвращаем как есть
      if (typeof item !== 'object' || item === null) {
        return item;
      }

      // Для объектов применяем фильтрацию по оставшемуся пути
      const result: Record<string, unknown> = {};
      const wrote = this.extractField(item as Record<string, unknown>, remainingPath, result);
      return wrote ? result : undefined;
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
   * Финальная очистка результата фильтрации: заменяет служебные маркеры `undefined`,
   * оставленные {@link filterArrayElements} в элементах массивов, у которых проекция
   * не извлекла ни одного поля, на `{}`.
   *
   * Запускается ОДИН РАЗ, в самом конце {@link filter}, когда все проекции по всем
   * путям для данного объекта уже смержены — поэтому здесь безопасно проходить по
   * массиву в третий раз: поэлементное соответствие, на которое опирается
   * {@link mergeArrayResults}, уже не требуется (оно происходит раньше, до compact).
   *
   * Находка 2 (BLOCKER/MAJOR внешнего ревью, проверено исполнением):
   * 1) Раньше эта ветка ПЕРЕСОБИРАЛА КАЖДЫЙ объект по `Object.keys()`, включая `Date`,
   *    `Map`, `Set` и другие не-plain-object значения, у которых `Object.keys()` не
   *    возвращает содержательных ключей — `Date` превращался в `{}`, теряя значение
   *    целиком (раньше значения копировались по ссылке и `Date` корректно сериализовался
   *    в ISO-строку через `toJSON()`/`toISOString()` при `JSON.stringify`). Публичная
   *    утилита фреймворка тихо перестала быть "фильтрует поля" и стала "фильтрует и
   *    делает lossy deep-copy". Исправлено: копируем (рекурсивно компактим) только
   *    СОБСТВЕННЫЕ простые объекты (`Object.prototype` или `null` в качестве
   *    прототипа) — всё остальное (Date/Map/Set/RegExp/произвольные class instances)
   *    возвращается КАК ЕСТЬ, без обхода по ключам.
   * 2) Раньше элементы массива с маркером `undefined` (ничего не извлечено для этого
   *    элемента) ВЫБРАСЫВАЛИСЬ из результата (`.filter(item => item !== undefined)`),
   *    что молча меняло длину массива относительно исходных данных — агент, считающий
   *    количество элементов по `array.length`, получал неверное число. Изменение длины
   *    массива — это уже искажение формы данных, а не просто "лишний шум", поэтому
   *    решение здесь: НЕ выбрасывать элемент, а заменять маркер на `{}` (честно отражает
   *    "у этого элемента нет ни одного из запрошенных полей", сохраняя позиционное
   *    соответствие и длину). Альтернатива (оставить как есть/просто убрать фильтрацию)
   *    была бы неполным фиксом только первой части находки; альтернатива "выбрасывать, но
   *    сообщать длину отдельным полем" усложняет каждый вызывающий outputSchema без
   *    выигрыша — сама находка 4 (см. extractField) уже страхует главный источник шума
   *    (весь путь, ничего не извлёкший ни у одного элемента) на уровне выше — там мы просто
   *    не создаём ключ-обёртку массива вовсе, так что `{}`-заглушки видны только там, где
   *    у СОСЕДНИХ элементов того же массива данные реально есть.
   *
   * Важно: удаляется/заменяется только собственный маркер `undefined`. Настоящее значение
   * `null`, пришедшее из API, никогда не превращается в `undefined` (см. extractField) и
   * поэтому всегда сохраняется — JSON в принципе не может содержать литерал `undefined`,
   * так что путаница с легитимными данными исключена.
   *
   * @param value - Результат фильтрации (объект, массив или примитив)
   * @returns Тот же результат без маркеров `undefined` внутри массивов (заменены на `{}`),
   *   с не-plain-object значениями (Date/Map/Set/...) сохранёнными без изменений
   */
  private static compact(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => (item === undefined ? {} : this.compact(item)));
    }

    if (this.isPlainObject(value)) {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        result[key] = this.compact(value[key]);
      }
      return result;
    }

    return value;
  }

  /**
   * Проверяет, что значение — "простой" объект (создан литералом `{}`, `Object.create(null)`
   * или `new Object()`), а не экземпляр `Date`/`Map`/`Set`/`RegExp`/произвольного класса.
   *
   * `filterObject`/`extractField` создают результирующие объекты именно так (`{}`), поэтому
   * рекурсивный обход {@link compact} обязан спускаться только в них. Значения листьев
   * копируются по ссылке (см. extractField, remainingPath.length === 0) и могут быть чем
   * угодно, включая `Date`/`Map`/`Set` — их прототип не `Object.prototype`, и в такие
   * значения {@link compact} спускаться не должен, иначе теряет их данные (см. Находка 2).
   *
   * @param value - Проверяемое значение
   * @returns true, если значение — plain object
   */
  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const proto: unknown = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
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
