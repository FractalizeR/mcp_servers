/**
 * Разбор JSONL-батча: валидные строки, битая строка с номером, пустой файл.
 *
 * Пустые строки (включая финальный перевод строки файла) пропускаются молча —
 * это не ошибка формата. Любая непустая строка обязана быть валидным вызовом;
 * при первой же ошибке разбора накапливаем остальные ошибки (не останавливаемся
 * на первой) — одна команда линта даёт полный список проблем файла, а не одну
 * за раз.
 */

import type { JSONObject } from '@modelcontextprotocol/client';
import type { BatchCall, BatchExpectation } from './types.js';

/** Ошибка разбора одной строки батча. */
export interface ParseBatchError {
  readonly line: number;
  readonly message: string;
}

/** Исходы {@link parseBatch}. */
export type ParseBatchResult =
  | { readonly outcome: 'ok'; readonly calls: readonly BatchCall[] }
  | { readonly outcome: 'empty' }
  | { readonly outcome: 'invalid'; readonly errors: readonly ParseBatchError[] };

type ShapeResult =
  | { readonly ok: true; readonly call: Omit<BatchCall, 'line'> }
  | { readonly ok: false; readonly message: string };

/** Допустимые ключи строки батча и вложенного `expect` — deny-by-default. */
const ALLOWED_CALL_KEYS = ['tool', 'args', 'label', 'expect'] as const;
const ALLOWED_EXPECT_KEYS = ['isError', 'contains'] as const;

/**
 * Отвергнуть неизвестные ключи.
 *
 * Без этого опечатка проходит молча и меняет смысл строки: `{"arg": {...}}`
 * уходит с пустыми аргументами, `{"expects": {...}}` — с невыполненной
 * проверкой, а батч рапортует «0 провалов». Тихо проигнорированное ожидание
 * хуже отсутствующего: оно выглядит как выполненное.
 */
function rejectUnknownKeys(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  scope: string
): { ok: true } | { ok: false; message: string } {
  const unknown = Object.keys(obj).filter((key) => !allowed.includes(key));
  if (unknown.length === 0) return { ok: true };
  return {
    ok: false,
    message: `Неизвестн${unknown.length > 1 ? 'ые поля' : 'ое поле'} ${scope}: ${unknown.map((k) => `"${k}"`).join(', ')}. Допустимые: ${allowed.join(', ')}`,
  };
}

function validateExpect(
  value: unknown
): { ok: true; expect?: BatchExpectation } | { ok: false; message: string } {
  if (value === undefined) return { ok: true };
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, message: 'Поле "expect" должно быть JSON-объектом' };
  }
  const raw = value as Record<string, unknown>;
  const unknownKeys = rejectUnknownKeys(raw, ALLOWED_EXPECT_KEYS, 'в "expect"');
  if (!unknownKeys.ok) return unknownKeys;
  if (raw['isError'] !== undefined && typeof raw['isError'] !== 'boolean') {
    return { ok: false, message: 'Поле "expect.isError" должно быть boolean' };
  }
  if (raw['contains'] !== undefined && typeof raw['contains'] !== 'string') {
    return { ok: false, message: 'Поле "expect.contains" должно быть строкой' };
  }
  return { ok: true, expect: raw as BatchExpectation };
}

function validateTool(
  obj: Record<string, unknown>
): { ok: true; tool: string } | { ok: false; message: string } {
  const tool = obj['tool'];
  if (typeof tool !== 'string' || tool.length === 0) {
    return { ok: false, message: 'Поле "tool" обязательно и должно быть непустой строкой' };
  }
  return { ok: true, tool };
}

function validateArgs(
  obj: Record<string, unknown>
): { ok: true; args?: JSONObject } | { ok: false; message: string } {
  const args = obj['args'];
  if (args === undefined) return { ok: true };
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    return { ok: false, message: 'Поле "args" должно быть JSON-объектом' };
  }
  return { ok: true, args: args as JSONObject };
}

function validateLabel(
  obj: Record<string, unknown>
): { ok: true; label?: string } | { ok: false; message: string } {
  const label = obj['label'];
  if (label === undefined) return { ok: true };
  if (typeof label !== 'string') {
    return { ok: false, message: 'Поле "label" должно быть строкой' };
  }
  return { ok: true, label };
}

function validateBatchCallShape(value: unknown): ShapeResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, message: 'Ожидался JSON-объект' };
  }
  const obj = value as Record<string, unknown>;

  const unknownKeys = rejectUnknownKeys(obj, ALLOWED_CALL_KEYS, 'строки батча');
  if (!unknownKeys.ok) return unknownKeys;

  const toolResult = validateTool(obj);
  if (!toolResult.ok) return toolResult;

  const argsResult = validateArgs(obj);
  if (!argsResult.ok) return argsResult;

  const labelResult = validateLabel(obj);
  if (!labelResult.ok) return labelResult;

  const expectResult = validateExpect(obj['expect']);
  if (!expectResult.ok) return expectResult;

  const call: Omit<BatchCall, 'line'> = {
    tool: toolResult.tool,
    args: argsResult.args ?? {},
    ...(labelResult.label !== undefined ? { label: labelResult.label } : {}),
    ...(expectResult.expect !== undefined ? { expect: expectResult.expect } : {}),
  };
  return { ok: true, call };
}

/** Разобрать JSONL-источник батча в список вызовов. */
export function parseBatch(source: string): ParseBatchResult {
  const lines = source.split('\n');
  const calls: BatchCall[] = [];
  const errors: ParseBatchError[] = [];

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line.length === 0) return;
    const lineNo = index + 1;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      errors.push({
        line: lineNo,
        message: `Невалидный JSON: ${error instanceof Error ? error.message : String(error)}`,
      });
      return;
    }

    const shape = validateBatchCallShape(parsed);
    if (!shape.ok) {
      errors.push({ line: lineNo, message: shape.message });
      return;
    }
    calls.push({ ...shape.call, line: lineNo });
  });

  if (errors.length > 0) return { outcome: 'invalid', errors };
  if (calls.length === 0) return { outcome: 'empty' };
  return { outcome: 'ok', calls };
}
