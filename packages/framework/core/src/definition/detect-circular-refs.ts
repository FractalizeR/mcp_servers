/**
 * Обнаружение циклических $ref в JSON Schema (draft 2020-12)
 *
 * Контекст: с переходом на draft-2020-12 (пакет 3.1.A) адаптер перестал
 * вырезать $ref/$defs. Zod способен сгенерировать структурно валидную, но
 * РЕКУРСИВНУЮ JSON Schema (self-referencing z.lazy) — валидна как документ,
 * но programmatic tool calling на стороне некоторых MCP-клиентов падает с
 * ошибкой "Circular $ref detected", хотя обычный (не programmatic) вызов
 * того же инструмента работает нормально. Без отдельной проверки такой
 * дефект вскрывается только у пользователя.
 *
 * Единственное место, где в этом проекте могут появиться циклы, — $ref,
 * указывающий на предка по цепочке разрешения (сам документ через "#" или
 * запись в "#/$defs/..."). Инлайновая структура сама по себе циклов
 * образовать не может (JSON конечен), поэтому детектор ищет цикл только
 * по рёбрам $ref.
 */

const MAX_RESOLUTION_DEPTH = 1000;

/**
 * Результат проверки на циклические $ref
 */
export interface CircularRefCheckResult {
  /** Есть ли цикл */
  hasCycle: boolean;
  /** Цепочка JSON-указателей, замкнувшая цикл (только если hasCycle === true) */
  cyclePath?: string[];
}

/**
 * Проверить JSON Schema документ на наличие циклических $ref.
 *
 * @param schema - корневой объект JSON Schema (например, ToolInputSchema)
 * @returns результат с флагом hasCycle и путём цикла (для диагностики)
 */
export function detectCircularRefs(schema: unknown): CircularRefCheckResult {
  const root = schema;

  function resolvePointer(pointer: string): unknown {
    if (pointer === '#') {
      return root;
    }
    if (!pointer.startsWith('#/')) {
      // Внешние ссылки ($ref на другой документ) вне области действия —
      // в наших схемах не встречаются (нет $id/external), считаем неразрешимыми.
      return undefined;
    }

    const segments = pointer
      .slice(2)
      .split('/')
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

    let node: unknown = root;
    for (const segment of segments) {
      if (node !== null && typeof node === 'object') {
        node = (node as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }
    return node;
  }

  // eslint-disable-next-line complexity
  function walk(
    node: unknown,
    pointer: string,
    activeRefStack: readonly string[],
    depth: number
  ): string[] | null {
    if (depth > MAX_RESOLUTION_DEPTH) {
      // Защитный предохранитель от неограниченной рекурсии в самом детекторе —
      // при штатной работе adapter'а недостижимо (схемы небольшие).
      throw new Error(
        `detectCircularRefs: превышена максимальная глубина разрешения (${MAX_RESOLUTION_DEPTH}) у ${pointer}`
      );
    }

    if (node === null || typeof node !== 'object') {
      return null;
    }

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const found = walk(node[i], `${pointer}/${i}`, activeRefStack, depth + 1);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const obj = node as Record<string, unknown>;

    if (typeof obj['$ref'] === 'string') {
      const target = obj['$ref'];

      if (activeRefStack.includes(target)) {
        return [...activeRefStack, target];
      }

      const resolved = resolvePointer(target);
      if (resolved === undefined) {
        // Битая ссылка — отдельный класс дефекта, не цикл. Не наша забота здесь.
        return null;
      }

      return walk(resolved, target, [...activeRefStack, target], depth + 1);
    }

    // Структурные ключевые слова JSON Schema, по которым идёт обход
    for (const key of ['properties', '$defs', 'patternProperties'] as const) {
      const child = obj[key];
      if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
        for (const [propName, propSchema] of Object.entries(child as Record<string, unknown>)) {
          const found = walk(
            propSchema,
            `${pointer}/${key}/${propName}`,
            activeRefStack,
            depth + 1
          );
          if (found) {
            return found;
          }
        }
      }
    }

    for (const key of ['items', 'additionalProperties'] as const) {
      const child = obj[key];
      if (child !== null && typeof child === 'object') {
        const found = walk(child, `${pointer}/${key}`, activeRefStack, depth + 1);
        if (found) {
          return found;
        }
      }
    }

    for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
      const variants = obj[key];
      if (Array.isArray(variants)) {
        for (let i = 0; i < variants.length; i++) {
          const found = walk(variants[i], `${pointer}/${key}/${i}`, activeRefStack, depth + 1);
          if (found) {
            return found;
          }
        }
      }
    }

    return null;
  }

  const cyclePath = walk(root, '#', [], 0);

  return cyclePath ? { hasCycle: true, cyclePath } : { hasCycle: false };
}
