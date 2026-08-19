/**
 * Чтение аргументов `call`: инлайновый JSON либо `@путь-к-файлу`.
 *
 * Ошибка разбора здесь (файл не существует, не JSON, не объект) — CLI-side и
 * умышленно отделена от ошибки валидации схемы аргументов на сервере
 * (та проявляется уже как `isError: true` в результате `tools/call`, см.
 * README плана, раздел «Кейсы и граничные условия»).
 */

import * as fs from 'node:fs/promises';
import type { JSONObject } from '@modelcontextprotocol/client';
import { describeError } from './io.js';

export type ReadToolArgsResult =
  | { readonly outcome: 'ok'; readonly args: JSONObject }
  | { readonly outcome: 'error'; readonly message: string };

async function readSource(
  input: string
): Promise<{ outcome: 'ok'; raw: string } | { outcome: 'error'; message: string }> {
  if (!input.startsWith('@')) {
    return { outcome: 'ok', raw: input };
  }
  const filePath = input.slice(1);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return { outcome: 'ok', raw };
  } catch (error) {
    return {
      outcome: 'error',
      message: `Не удалось прочитать файл аргументов "${filePath}": ${describeError(error)}`,
    };
  }
}

/** Разобрать второй позиционный аргумент `call` (`<json|@file>`) в объект аргументов инструмента. */
export async function readToolArgs(input: string): Promise<ReadToolArgsResult> {
  const sourceResult = await readSource(input);
  if (sourceResult.outcome === 'error') return sourceResult;

  let parsed: unknown;
  try {
    parsed = JSON.parse(sourceResult.raw);
  } catch (error) {
    return {
      outcome: 'error',
      message: `Аргументы не являются валидным JSON: ${describeError(error)}`,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { outcome: 'error', message: 'Аргументы должны быть JSON-объектом' };
  }
  return { outcome: 'ok', args: parsed as JSONObject };
}
