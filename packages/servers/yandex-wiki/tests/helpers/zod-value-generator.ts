// tests/helpers/zod-value-generator.ts
/**
 * Генератор "достижимого" значения для произвольной Zod-схемы — только для
 * тестов пакета 7.1.B (см. .agentic-planning/plan_mcp_2026_modernization/
 * 7.1_api_defects_parallel.md, DoD п.2: "тест обходит реестр и сверяет поля
 * схемы с тем, что реально отправляет операция").
 *
 * Не полный интроспектор внутренностей Zod (checks/_def меняются между
 * версиями) — вместо этого перебирает небольшой набор type-appropriate
 * кандидатов и берёт первый, который сама схема принимает через safeParse.
 * Это устойчиво к деталям реализации конкретной версии zod (проект на v4) и
 * достаточно для цели: получить ПОЛНОСТЬЮ заполненный (включая опциональные
 * поля) валидный объект параметров, чтобы проверить, что каждое поле
 * долетает до HTTP-запроса.
 */

import { z } from 'zod';

const STRING_CANDIDATES = (fieldName: string): string[] => [
  `VALUE_${fieldName}`,
  `VALUE_${fieldName}`.padEnd(8, 'x'),
  '550e8400-e29b-41d4-a716-446655440000',
  'x',
  'a'.repeat(2000),
];

// Большое число первым — чтобы для полей БЕЗ ограничений (типичный
// идентификатор) значение было отличимым от случайных совпадений в теле
// запроса; для полей с min/max генератор упадёт на меньшие кандидаты.
const NUMBER_CANDIDATES = [918273, 7, 3, 1, 0, 10, 25, 50, 100, -1];

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional) return unwrap(schema.unwrap());
  if (schema instanceof z.ZodNullable) return unwrap(schema.unwrap());
  if (schema instanceof z.ZodDefault) return unwrap(schema.removeDefault());
  return schema;
}

function generateArray(schema: z.ZodArray<z.ZodTypeAny>, fieldName: string): unknown[] {
  const element = schema.element as z.ZodTypeAny;
  // Всегда генерируем НЕПУСТОЙ массив, даже если схема допускает пустой
  // (например, `z.array(...).optional()` без `.min(1)`) — иначе поле,
  // пустое по умолчанию, никогда не проверило бы свою reachability
  // (пустой массив легитимно нигде не появляется в запросе, и это не баг).
  let attempt: unknown[] = [generateValue(element, fieldName)];
  for (let i = 0; i < 5 && !schema.safeParse(attempt).success; i++) {
    attempt = [...attempt, generateValue(element, fieldName)];
  }
  return attempt;
}

function generateObject(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const shape = schema.shape;
  const obj: Record<string, unknown> = {};
  for (const key of Object.keys(shape)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    obj[key] = generateValue(shape[key]!, key);
  }
  return obj;
}

export function generateValue(schemaIn: z.ZodTypeAny, fieldName: string): unknown {
  const schema = unwrap(schemaIn);

  if (schema instanceof z.ZodLiteral) return schema.value;

  if (schema instanceof z.ZodEnum) {
    const options = schema.options as unknown[];
    const first = options[0];
    if (first === undefined) {
      throw new Error(`Пустой enum для поля "${fieldName}"`);
    }
    return first;
  }

  if (schema instanceof z.ZodBoolean) return true;

  if (schema instanceof z.ZodNumber) {
    for (const candidate of NUMBER_CANDIDATES) {
      if (schema.safeParse(candidate).success) return candidate;
    }
    throw new Error(`Не найден кандидат number для поля "${fieldName}"`);
  }

  if (schema instanceof z.ZodString) {
    for (const candidate of STRING_CANDIDATES(fieldName)) {
      if (schema.safeParse(candidate).success) return candidate;
    }
    throw new Error(`Не найден кандидат string для поля "${fieldName}"`);
  }

  if (schema instanceof z.ZodArray) {
    return generateArray(schema as z.ZodArray<z.ZodTypeAny>, fieldName);
  }

  if (schema instanceof z.ZodObject) {
    return generateObject(schema as z.ZodObject<z.ZodRawShape>);
  }

  if (schema instanceof z.ZodUnion) {
    const options = schema.options as z.ZodTypeAny[];
    for (const option of options) {
      try {
        return generateValue(option, fieldName);
      } catch {
        // пробуем следующий вариант union
      }
    }
    throw new Error(`Не найден подходящий вариант union для поля "${fieldName}"`);
  }

  if (schema instanceof z.ZodUnknown || schema instanceof z.ZodAny) {
    return `VALUE_${fieldName}`;
  }

  throw new Error(
    `generateValue: неподдержанный тип Zod для поля "${fieldName}": ${schema.constructor.name}`
  );
}

/**
 * Сгенерировать ПОЛНОСТЬЮ заполненный (включая опциональные поля) валидный
 * объект параметров верхнего уровня для z.object()-схемы инструмента.
 */
export function generateFullParams(objSchema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  return generateObject(objSchema);
}
