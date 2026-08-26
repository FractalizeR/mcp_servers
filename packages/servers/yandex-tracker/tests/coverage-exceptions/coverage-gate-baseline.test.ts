/**
 * Самотест храповика дыр: без него отказ «в обе стороны» держится на комментарии, а
 * односторонний храповик разрешает вернуть закрытую дыру навсегда.
 */

import { describe, it, expect } from 'vitest';
import {
  collectCoverageGateViolations,
  computeBaselineOriginDigest,
  assertBaselineOriginIntact,
  coverageGateKey,
  COVERAGE_GATE_BASELINE,
  COVERAGE_GATE_BASELINE_ORIGIN,
  COVERAGE_GATE_BASELINE_ORIGIN_DIGEST,
} from './coverage-gate-baseline.js';
import type { CoverageHole } from './coverage-gate-baseline.js';

const BASELINE: ReadonlySet<string> = new Set(['get_users[С-2]', 'demo[С-3]']);
/** Синтетический снимок: боевой сделал бы «дописанным» весь синтетический базлайн. */
const ORIGIN: ReadonlySet<string> = BASELINE;
const NO_RETIRED: ReadonlySet<string> = new Set();

function hole(tool: string, property: CoverageHole['property']): CoverageHole {
  return { tool, property };
}

describe('collectCoverageGateViolations', () => {
  it('набор дыр совпал с базлайном — нарушений нет', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2'), hole('demo', 'С-3')],
      BASELINE,
      NO_RETIRED,
      ORIGIN
    );

    expect(violations).toEqual({
      appeared: [],
      closed: [],
      retiredNotInBaseline: [],
      addedWithoutRetirement: [],
    });
  });

  it('пара вне набора стала дырой — отказ с её именем', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2'), hole('demo', 'С-3'), hole('ping', 'С-6')],
      BASELINE,
      NO_RETIRED,
      ORIGIN
    );

    expect(violations.appeared).toEqual(['ping[С-6]']);
    expect(violations.closed).toEqual([]);
  });

  it('пара из набора перестала быть дырой — тоже отказ, с требованием убрать строку', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2')],
      BASELINE,
      NO_RETIRED,
      ORIGIN
    );

    expect(violations.appeared).toEqual([]);
    expect(violations.closed).toEqual(['demo[С-3]']);
  });

  it('размен «закрыли одну, потеряли другую» не проходит — скаляр его не отличил бы', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2'), hole('ping', 'С-6')],
      BASELINE,
      NO_RETIRED,
      ORIGIN
    );

    expect(violations.appeared).toEqual(['ping[С-6]']);
    expect(violations.closed).toEqual(['demo[С-3]']);
  });

  it('снятое живое наблюдение — не «потеряли тест»: отдельная категория, а не appeared', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2'), hole('demo', 'С-3'), hole('update_board', 'С-4')],
      BASELINE,
      new Set(['update_board[С-4]']),
      ORIGIN
    );

    expect(violations.appeared).toEqual([]);
    expect(violations.retiredNotInBaseline).toEqual(['update_board[С-4]']);
  });

  it('снятое наблюдение, дописанное в базлайн, нарушением не является', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2'), hole('demo', 'С-3'), hole('update_board', 'С-4')],
      new Set([...BASELINE, 'update_board[С-4]']),
      new Set(['update_board[С-4]']),
      ORIGIN
    );

    expect(violations).toEqual({
      appeared: [],
      closed: [],
      retiredNotInBaseline: [],
      addedWithoutRetirement: [],
    });
  });

  it('новая дыра БЕЗ записи о снятии остаётся appeared — храповик не ослаблен', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2'), hole('demo', 'С-3'), hole('ping', 'С-6')],
      BASELINE,
      new Set(['update_board[С-4]']),
      ORIGIN
    );

    expect(violations.appeared).toEqual(['ping[С-6]']);
    expect(violations.retiredNotInBaseline).toEqual([]);
  });

  it('строка, дописанная в базлайн БЕЗ записи о снятии, роняет прогон', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2'), hole('demo', 'С-3'), hole('update_board', 'С-4')],
      new Set([...BASELINE, 'update_board[С-4]']),
      NO_RETIRED,
      ORIGIN
    );

    expect(violations.addedWithoutRetirement).toEqual(['update_board[С-4]']);
    // Без этой категории дыра выглядела бы унаследованной: остальные три пусты.
    expect(violations.appeared).toEqual([]);
    expect(violations.retiredNotInBaseline).toEqual([]);
    expect(violations.closed).toEqual([]);
  });

  it('та же строка С ЗАПИСЬЮ о снятии нарушением не является', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2'), hole('demo', 'С-3'), hole('update_board', 'С-4')],
      new Set([...BASELINE, 'update_board[С-4]']),
      new Set(['update_board[С-4]']),
      ORIGIN
    );

    expect(violations.addedWithoutRetirement).toEqual([]);
  });

  it('удаление строки базлайна снимком не запрещено — храповик по-прежнему едет вниз', () => {
    const violations = collectCoverageGateViolations(
      [hole('get_users', 'С-2')],
      new Set(['get_users[С-2]']),
      NO_RETIRED,
      ORIGIN
    );

    expect(violations.addedWithoutRetirement).toEqual([]);
    expect(violations.appeared).toEqual([]);
  });

  it('боевой базлайн состоит из ключей объявленной формы', () => {
    for (const key of COVERAGE_GATE_BASELINE) {
      expect(key).toMatch(/^[a-z0-9_]+\[С-[2346]\]$/);
    }
    expect(coverageGateKey('get_users', 'С-2')).toBe('get_users[С-2]');
  });

  it('боевой базлайн целиком принадлежит снимку — сегодня дописанных строк нет', () => {
    const violations = collectCoverageGateViolations(
      [...COVERAGE_GATE_BASELINE].map((key) => {
        const [tool, property] = key.slice(0, -1).split('[');
        return hole(tool as string, property as CoverageHole['property']);
      }),
      COVERAGE_GATE_BASELINE,
      new Set(),
      COVERAGE_GATE_BASELINE_ORIGIN
    );

    expect(violations.addedWithoutRetirement).toEqual([]);
  });
});

describe('снимок базлайна', () => {
  it('отпечаток боевого снимка совпадает с зафиксированным', () => {
    expect(computeBaselineOriginDigest()).toBe(COVERAGE_GATE_BASELINE_ORIGIN_DIGEST);
    expect(() => {
      assertBaselineOriginIntact();
    }).not.toThrow();
  });

  it('дописанная в снимок строка роняет прогон — иначе обход храповика бесшумен', () => {
    expect(() => {
      assertBaselineOriginIntact(
        new Set([...COVERAGE_GATE_BASELINE_ORIGIN, 'update_board[С-4]']),
        COVERAGE_GATE_BASELINE_ORIGIN_DIGEST
      );
    }).toThrow(/COVERAGE_GATE_BASELINE_ORIGIN/);
  });

  it('отпечаток не зависит от порядка строк — предмет сверки состав, а не раскладка', () => {
    const reversed = new Set([...COVERAGE_GATE_BASELINE_ORIGIN].reverse());

    expect(computeBaselineOriginDigest(reversed)).toBe(COVERAGE_GATE_BASELINE_ORIGIN_DIGEST);
  });
});
