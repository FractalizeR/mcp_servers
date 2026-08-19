/**
 * Тесты допуска батча к выполнению: deny-by-default для неизвестных инструментов
 * и для write/local-side-effect без флага.
 */

import { describe, it, expect } from 'vitest';
import { assertAllowed, WritePolicyError } from '../../../src/write-policy/assert-allowed.js';
import type { ToolSummary } from '../../../src/write-policy/classify.js';

const TOOLS: ToolSummary[] = [
  { name: 'read_tool', readOnly: true, destructive: false, hasPathArgs: false },
  { name: 'write_tool', readOnly: false, destructive: false, hasPathArgs: false },
  { name: 'side_effect_tool', readOnly: true, destructive: false, hasPathArgs: true },
];

describe('assertAllowed', () => {
  it('read-инструмент проходит без флага', () => {
    expect(() => assertAllowed(TOOLS, [{ tool: 'read_tool' }], false)).not.toThrow();
  });

  it('write-инструмент без флага — отказ (WritePolicyError) до отправки tools/call', () => {
    expect(() => assertAllowed(TOOLS, [{ tool: 'write_tool' }], false)).toThrow(WritePolicyError);
  });

  it('write-инструмент с флагом — проходит', () => {
    expect(() => assertAllowed(TOOLS, [{ tool: 'write_tool' }], true)).not.toThrow();
  });

  it('local-side-effect без флага — тоже отказ (не только "write")', () => {
    expect(() => assertAllowed(TOOLS, [{ tool: 'side_effect_tool' }], false)).toThrow(
      WritePolicyError
    );
  });

  it('неизвестный инструмент — deny by default независимо от allowWrite', () => {
    expect(() => assertAllowed(TOOLS, [{ tool: 'no_such_tool' }], true)).toThrow(WritePolicyError);
    expect(() => assertAllowed(TOOLS, [{ tool: 'no_such_tool' }], true)).toThrow(
      /Неизвестный инструмент/
    );
  });

  it('батч целиком проверяется до первого вызова: write в конце списка тоже блокирует весь батч', () => {
    expect(() =>
      assertAllowed(TOOLS, [{ tool: 'read_tool' }, { tool: 'write_tool' }], false)
    ).toThrow(WritePolicyError);
  });

  it('пустой список вызовов — не бросает', () => {
    expect(() => assertAllowed(TOOLS, [], false)).not.toThrow();
  });
});
