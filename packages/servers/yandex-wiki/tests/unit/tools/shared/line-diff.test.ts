// tests/unit/tools/shared/line-diff.test.ts
import { describe, it, expect } from 'vitest';
import { computeLineDiff, summarizeLineDiff } from '../../../../src/tools/shared/line-diff.js';

describe('computeLineDiff', () => {
  it('идентичные тексты — все строки equal', () => {
    const result = computeLineDiff('a\nb\nc', 'a\nb\nc');
    expect(result.every((entry) => entry.op === 'equal')).toBe(true);
    expect(summarizeLineDiff(result)).toEqual({
      linesAdded: 0,
      linesRemoved: 0,
      linesUnchanged: 3,
    });
  });

  it('чисто добавленные строки', () => {
    const result = computeLineDiff('a\nb', 'a\nb\nc\nd');
    const summary = summarizeLineDiff(result);
    expect(summary.linesAdded).toBe(2);
    expect(summary.linesRemoved).toBe(0);
    expect(summary.linesUnchanged).toBe(2);
  });

  it('чисто удалённые строки', () => {
    const result = computeLineDiff('a\nb\nc\nd', 'a\nb');
    const summary = summarizeLineDiff(result);
    expect(summary.linesAdded).toBe(0);
    expect(summary.linesRemoved).toBe(2);
    expect(summary.linesUnchanged).toBe(2);
  });

  it('замена строки в середине — remove + add вокруг сохранённого контекста', () => {
    const result = computeLineDiff('a\nb\nc', 'a\nx\nc');
    const summary = summarizeLineDiff(result);
    expect(summary.linesUnchanged).toBe(2); // a, c
    expect(summary.linesRemoved).toBe(1); // b
    expect(summary.linesAdded).toBe(1); // x
  });

  it('нумерация строк корректна для equal/remove/add', () => {
    const result = computeLineDiff('a\nb', 'a\nc');
    const equalEntry = result.find((entry) => entry.op === 'equal');
    const removeEntry = result.find((entry) => entry.op === 'remove');
    const addEntry = result.find((entry) => entry.op === 'add');

    expect(equalEntry).toMatchObject({ text: 'a', oldLineNumber: 1, newLineNumber: 1 });
    expect(removeEntry).toMatchObject({ text: 'b', oldLineNumber: 2 });
    expect(removeEntry?.newLineNumber).toBeUndefined();
    expect(addEntry).toMatchObject({ text: 'c', newLineNumber: 2 });
    expect(addEntry?.oldLineNumber).toBeUndefined();
  });

  it('пустые тексты — одна пустая строка с каждой стороны, equal', () => {
    const result = computeLineDiff('', '');
    expect(result).toEqual([{ op: 'equal', text: '', oldLineNumber: 1, newLineNumber: 1 }]);
  });
});
