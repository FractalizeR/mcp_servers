/**
 * Тесты разбора JSONL-батча: валидные строки, битая строка с номером, пустой файл.
 */

import { describe, it, expect } from 'vitest';
import { parseBatch } from '../../../src/batch/parse-batch.js';

describe('parseBatch', () => {
  it('разбирает несколько валидных строк', () => {
    const source = [
      '{"tool": "get_issue", "args": {"issueId": "TEST-1"}}',
      '{"tool": "get_issue", "args": {"issueId": "TEST-2"}, "label": "second"}',
    ].join('\n');
    const result = parseBatch(source);
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') throw new Error('unreachable');
    expect(result.calls).toHaveLength(2);
    expect(result.calls[0]).toEqual({ tool: 'get_issue', args: { issueId: 'TEST-1' }, line: 1 });
    expect(result.calls[1]).toEqual({
      tool: 'get_issue',
      args: { issueId: 'TEST-2' },
      label: 'second',
      line: 2,
    });
  });

  it('пропускает пустые строки (включая финальный перевод строки)', () => {
    const source = '{"tool": "a"}\n\n{"tool": "b"}\n';
    const result = parseBatch(source);
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') throw new Error('unreachable');
    expect(result.calls).toHaveLength(2);
    expect(result.calls.map((c) => c.tool)).toEqual(['a', 'b']);
  });

  it('пустой файл (только пробелы/переводы строк) → outcome: empty', () => {
    expect(parseBatch('').outcome).toBe('empty');
    expect(parseBatch('\n\n   \n').outcome).toBe('empty');
  });

  it('битая строка JSON → outcome: invalid с номером строки', () => {
    const source = '{"tool": "a"}\n{not valid json\n{"tool": "c"}';
    const result = parseBatch(source);
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') throw new Error('unreachable');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.line).toBe(2);
    expect(result.errors[0]?.message).toContain('Невалидный JSON');
  });

  it('накапливает несколько ошибок сразу (не останавливается на первой)', () => {
    const source = '{bad1\n{"tool": "ok"}\n{bad2';
    const result = parseBatch(source);
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') throw new Error('unreachable');
    expect(result.errors.map((e) => e.line)).toEqual([1, 3]);
  });

  it('отсутствие "tool" → invalid', () => {
    const result = parseBatch('{"args": {}}');
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') throw new Error('unreachable');
    expect(result.errors[0]?.message).toContain('tool');
  });

  it('"tool" пустая строка → invalid', () => {
    const result = parseBatch('{"tool": ""}');
    expect(result.outcome).toBe('invalid');
  });

  it('"args" не объект → invalid', () => {
    const result = parseBatch('{"tool": "a", "args": [1,2,3]}');
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') throw new Error('unreachable');
    expect(result.errors[0]?.message).toContain('args');
  });

  it('"label" не строка → invalid', () => {
    const result = parseBatch('{"tool": "a", "label": 5}');
    expect(result.outcome).toBe('invalid');
  });

  it('строка целиком не объект (массив/примитив) → invalid', () => {
    expect(parseBatch('[1,2,3]').outcome).toBe('invalid');
    expect(parseBatch('"just a string"').outcome).toBe('invalid');
    expect(parseBatch('42').outcome).toBe('invalid');
  });

  it('"expect" валиден: isError boolean, contains строка', () => {
    const result = parseBatch('{"tool": "a", "expect": {"isError": false, "contains": "ok"}}');
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') throw new Error('unreachable');
    expect(result.calls[0]?.expect).toEqual({ isError: false, contains: 'ok' });
  });

  it('"expect.isError" не boolean → invalid', () => {
    const result = parseBatch('{"tool": "a", "expect": {"isError": "yes"}}');
    expect(result.outcome).toBe('invalid');
  });

  it('"expect.contains" не строка → invalid', () => {
    const result = parseBatch('{"tool": "a", "expect": {"contains": 5}}');
    expect(result.outcome).toBe('invalid');
  });

  it('"expect" не объект → invalid', () => {
    const result = parseBatch('{"tool": "a", "expect": "nope"}');
    expect(result.outcome).toBe('invalid');
  });

  it('вызов без "args" получает пустой объект по умолчанию', () => {
    const result = parseBatch('{"tool": "a"}');
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') throw new Error('unreachable');
    expect(result.calls[0]?.args).toEqual({});
  });

  it('неизвестный ключ строки батча → invalid с номером строки и списком допустимых (M1)', () => {
    // Регресс: опечатка `arg` вместо `args` уходила с пустыми аргументами.
    const result = parseBatch('{"tool": "a", "arg": {"x": 1}}');
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') throw new Error('unreachable');
    expect(result.errors[0]?.line).toBe(1);
    expect(result.errors[0]?.message).toContain('"arg"');
    expect(result.errors[0]?.message).toContain('tool, args, label, expect');
  });

  it('опечатка "expects" вместо "expect" → invalid, а не молча невыполненная проверка (M1)', () => {
    const result = parseBatch('{"tool": "a", "expects": {"contains": "x"}}');
    expect(result.outcome).toBe('invalid');
  });

  it('неизвестный ключ внутри "expect" → invalid (M1)', () => {
    const result = parseBatch('{"tool": "a", "expect": {"contain": "x"}}');
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') throw new Error('unreachable');
    expect(result.errors[0]?.message).toContain('expect');
  });

  it('ошибки собираются по всем строкам, номера строк сохраняются', () => {
    const result = parseBatch('{"tool": "a"}\n{"tool": "b", "typo": 1}\n{"tool": "c", "nope": 2}');
    expect(result.outcome).toBe('invalid');
    if (result.outcome !== 'invalid') throw new Error('unreachable');
    expect(result.errors.map((e) => e.line)).toEqual([2, 3]);
  });
});
