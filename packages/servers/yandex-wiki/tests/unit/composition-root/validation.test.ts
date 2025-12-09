// tests/unit/composition-root/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateDIRegistrations } from '../../../src/composition-root/validation.js';

describe('validateDIRegistrations', () => {
  it('должен пройти валидацию для уникальных классов', () => {
    // В нормальных условиях все классы уникальны
    expect(() => validateDIRegistrations()).not.toThrow();
  });

  it('должен быть функцией', () => {
    expect(typeof validateDIRegistrations).toBe('function');
  });

  it('должен валидировать без возврата значения', () => {
    const result = validateDIRegistrations();
    expect(result).toBeUndefined();
  });
});
