/**
 * Формат батча: JSONL, одна строка = один вызов.
 * `{"tool": "<имя>", "args": { ... }, "label": "<опционально>", "expect": {"isError": false, "contains": "<подстрока>"}}`
 */

import type { JSONObject } from '@modelcontextprotocol/client';

/** Ожидание для строки батча — проверяется после вызова, попадает в `expectationMet`. */
export interface BatchExpectation {
  readonly isError?: boolean;
  readonly contains?: string;
}

/** Один разобранный вызов батча. `line` — номер строки в исходном JSONL (для диагностики). */
export interface BatchCall {
  readonly tool: string;
  readonly args: JSONObject;
  readonly label?: string;
  readonly expect?: BatchExpectation;
  readonly line: number;
}

/** Результат одного вызова батча. */
export interface BatchCallOutcome {
  readonly line: number;
  readonly label?: string;
  readonly tool: string;
  /** `false` — результата вызова нет: либо он не отправлялся, либо не дождался ответа. */
  readonly ran: boolean;
  readonly isError?: boolean;
  readonly content?: unknown;
  readonly structuredContent?: unknown;
  readonly durationMs?: number;
  /** `undefined`, если `expect` не задан у строки батча. */
  readonly expectationMet?: boolean;
  /** Замаскированное сообщение об ошибке — заполнено только если `ran === false` из-за исключения при вызове. */
  readonly error?: string;
  /**
   * Причина, по которой вызов не отправлялся вовсе. Без неё пропущенная строка
   * неотличима от строки, которая отработала и ничего не вернула.
   *
   * - `serverDown` — транспорт/сессия упали на предыдущей строке батча;
   * - `stopOnError` — предыдущая строка провалилась при `--stop-on-error`.
   */
  readonly skipReason?: 'serverDown' | 'stopOnError';
  /** `true` — вызов был отправлен, но не уложился в таймаут строки (сервер при этом жив, батч продолжается). */
  readonly timedOut?: boolean;
}

/** Итог прогона батча. */
export interface BatchOutcome {
  readonly results: readonly BatchCallOutcome[];
  /**
   * `true`, только если **каждая** строка батча реально отработала (`ran: true`)
   * и её `expect`, если он задан, сошёлся.
   *
   * Не отработавшая строка — пропущенная (`skipReason`), вышедшая за таймаут
   * (`timedOut`) или упавшая с исключением — делает флаг `false` независимо от
   * наличия `expect`: «ожидания сошлись» не может быть правдой про вызов,
   * которого не было.
   */
  readonly allExpectationsMet: boolean;
}
