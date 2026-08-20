/**
 * Детектор непризнанных параметров верхнего уровня (README §5 плана
 * `plan_tool_contract_unification`, находка 4 живого прогона): при
 * `additionalProperties: false` JSON Schema (протокольный уровень) сообщение
 * называет только НЕДОСТАЮЩИЙ параметр — Zod по умолчанию (`z.object()`, без
 * `.strict()`) молча отбрасывает лишние ключи и никак не отражает их в issues.
 * `BaseTool.formatValidationError` дописывает эти имена в сообщение об ошибке,
 * когда запрос уже невалиден по другой причине.
 */

import type { ToolCallParams } from '@fractalizer/mcp-infrastructure';
import type { ZodSchema } from 'zod';

/**
 * Имена ключей верхнего уровня `params`, которых нет в форме объекта `schema`.
 *
 * Duck-typing вместо `instanceof z.ZodObject`: после `.refine()`/`.superRefine()`
 * Zod v4 сохраняет `.shape` на том же объекте (не оборачивает в `ZodEffects`,
 * как v3), но полагаться на конкретный конструктор — хрупко при апгрейде Zod.
 * Схемы без `.shape` молча дают пустой список — без объектной формы у "лишнего
 * параметра" нет чёткого смысла.
 */
export function findUnrecognizedTopLevelKeys(
  params: ToolCallParams,
  schema: ZodSchema<unknown>
): string[] {
  const shape: unknown = (schema as { shape?: unknown }).shape;
  if (typeof shape !== 'object' || shape === null) {
    return [];
  }
  const knownKeys = new Set(Object.keys(shape));
  return Object.keys(params).filter((key) => !knownKeys.has(key));
}

/**
 * Дополняет сообщение об ошибке валидации именами непризнанных параметров
 * (находка 4, README §5 плана `plan_tool_contract_unification`): Zod без
 * `.strict()` молча отбрасывает лишние ключи, и стандартный `issues` их не
 * называет, хотя запрос уже невалиден по другой причине.
 */
export function describeValidationErrorWithUnrecognizedKeys(
  baseMessage: string,
  params: ToolCallParams,
  schema: ZodSchema<unknown>
): string {
  const unrecognizedKeys = findUnrecognizedTopLevelKeys(params, schema);
  return unrecognizedKeys.length > 0
    ? `${baseMessage}; неизвестные параметры: ${unrecognizedKeys.join(', ')}`
    : baseMessage;
}
