/**
 * Контракт предупреждений success envelope (план `plan_tool_contract_unification`,
 * README §3).
 *
 * По ответу API невозможно отличить опечатку в имени поля от легитимно пустого
 * значения — поэтому несовпадение того, что запросил вызывающий, с тем, что
 * реально пришло, выражается ПРЕДУПРЕЖДЕНИЕМ внутри успешного ответа, а не
 * ошибкой валидации и не протокольным `notifications/message` (тело ответа
 * модель видит гарантированно, канал уведомлений — нет).
 *
 * Перечень кодов ЗАМКНУТЫЙ — расширяется только через правку этого файла:
 * - `FIELDS_WITHOUT_VALUE` — путь из параметра `fields` не дал значения ни у
 *   одного элемента ответа (детектор — `ResponseFieldFilter`, см. README §4).
 * - `UNKNOWN_PARAMETER` — во входных параметрах есть имя, которого нет в схеме
 *   инструмента, а запрос в остальном валиден (README §5).
 * - `AMBIGUOUS_ENTITY_ID` — операция создала сущность, чей идентификатор
 *   совпал с идентификатором другой существующей сущности в той же области
 *   видимости: наблюдаемый факт — коллизия id, а не гипотеза о её причине.
 *   Домен формулирует конкретику (какая сущность, какая область видимости) в
 *   `message`/`details` инструмента — здесь код только про сам факт коллизии.
 */

import { z } from 'zod';

export const ToolWarningCode = {
  FIELDS_WITHOUT_VALUE: 'FIELDS_WITHOUT_VALUE',
  UNKNOWN_PARAMETER: 'UNKNOWN_PARAMETER',
  AMBIGUOUS_ENTITY_ID: 'AMBIGUOUS_ENTITY_ID',
} as const;

export type ToolWarningCode = (typeof ToolWarningCode)[keyof typeof ToolWarningCode];

/**
 * Одно предупреждение success envelope.
 *
 * `message` называет НАБЛЮДАЕМЫЙ факт («по такому-то пути не пришло значения»),
 * а не гипотезу о причине («неизвестное поле») — см. README §2.
 */
export interface ToolWarning {
  code: ToolWarningCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Zod-схема одного предупреждения — источник для `outputSchema` инструментов. */
export const ToolWarningSchema = z.object({
  code: z.enum([
    ToolWarningCode.FIELDS_WITHOUT_VALUE,
    ToolWarningCode.UNKNOWN_PARAMETER,
    ToolWarningCode.AMBIGUOUS_ENTITY_ID,
  ]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Массив предупреждений envelope. Инвариант «присутствует только когда непусто»
 * (README §3) соблюдается вызывающей стороной (`formatSuccess`) — здесь описана
 * ФОРМА поля, а не то, когда его включать.
 */
export const ToolWarningsSchema = z.array(ToolWarningSchema).min(1);
