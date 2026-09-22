/**
 * Тесты формулировки подсказки об оптимистичной блокировке.
 *
 * Проверяется не дословный текст (он правится), а инварианты, ради которых
 * билдер и заведён: риск назван, источник значения назван, исход при конфликте
 * не обещается там, где он не наблюдался.
 */

import { describe, it, expect } from 'vitest';
import { buildOptimisticLockDescription } from '../../src/definition/optimistic-lock-description.js';

/**
 * Худший боевой случай на момент написания: самый длинный `source` (Трекер,
 * клауза про `fields`) вместе с `lead` инструмента `manage_sprint_lifecycle` —
 * бюджет длины меряется по нему, а не по удобному короткому вызову.
 */
const LONGEST_SOURCE = 'в ответе get_sprint/get_sprints (запроси его в fields)';
const LONGEST_LEAD =
  "Только для action 'start'/'archive' — у 'delete' параметр запрещён схемой: эндпоинт удаления версию не принимает.";

describe('buildOptimisticLockDescription', () => {
  it('для наблюдённой перезаписи называет риск, не обещая её в каждом вызове', () => {
    const text = buildOptimisticLockDescription({
      paramName: 'version',
      source: LONGEST_SOURCE,
      conflict: 'silent-overwrite',
    });

    expect(text).toContain('может незаметно перезаписать');
    expect(text).toContain('version');
    expect(text).toContain(LONGEST_SOURCE);
  });

  it('для ненаблюдённого исхода не обещает ни отказа, ни перезаписи', () => {
    const text = buildOptimisticLockDescription({
      paramName: 'revision',
      source: 'в ответе yw_get_grid',
      conflict: 'unspecified',
    });

    expect(text).toContain('передавай актуальное значение');
    expect(text).not.toContain('перезапис');
    expect(text).not.toMatch(/отклон|отказ/);
  });

  it('оговорка области применения встаёт ПЕРЕД советом передавать токен', () => {
    const text = buildOptimisticLockDescription({
      paramName: 'version',
      source: 'в ответе get_sprint/get_sprints',
      conflict: 'silent-overwrite',
      lead: "Только для action 'start'/'archive'.",
    });

    expect(text.indexOf('Только для action')).toBe(0);
    expect(text.indexOf('Только для action')).toBeLessThan(text.indexOf('Токен'));
  });

  it('текст не разрастается в абзац (множится на 13 полей)', () => {
    const withoutLead = buildOptimisticLockDescription({
      paramName: 'version',
      source: LONGEST_SOURCE,
      conflict: 'silent-overwrite',
    });

    // Без оговорки — ровно два предложения: риск и источник.
    expect(withoutLead.split('. ').length).toBe(2);
    expect(withoutLead.length).toBeLessThanOrEqual(200);

    const worstCase = buildOptimisticLockDescription({
      paramName: 'version',
      source: LONGEST_SOURCE,
      conflict: 'silent-overwrite',
      lead: LONGEST_LEAD,
    });

    expect(worstCase.length).toBeLessThanOrEqual(330);
  });
});
