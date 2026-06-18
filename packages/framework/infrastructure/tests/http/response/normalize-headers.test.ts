/**
 * Unit тесты для normalizeHeaders
 */

import { describe, it, expect } from 'vitest';
import { normalizeHeaders } from '@fractalizer/mcp-infrastructure/http/response/normalize-headers.js';

describe('normalizeHeaders', () => {
  it('возвращает пустой объект для non-object', () => {
    expect(normalizeHeaders(undefined)).toEqual({});
    expect(normalizeHeaders(null)).toEqual({});
    expect(normalizeHeaders('x')).toEqual({});
  });

  it('приводит ключи к нижнему регистру', () => {
    const result = normalizeHeaders({ 'X-Total-Count': '150', Link: '<u>; rel="next"' });
    expect(result['x-total-count']).toBe('150');
    expect(result['link']).toBe('<u>; rel="next"');
  });

  it('склеивает массивы значений через запятую', () => {
    const result = normalizeHeaders({ 'set-cookie': ['a=1', 'b=2'] });
    expect(result['set-cookie']).toBe('a=1, b=2');
  });

  it('отбрасывает undefined/null значения', () => {
    const result = normalizeHeaders({ a: undefined, b: null, c: '1' });
    expect(result).toEqual({ c: '1' });
  });

  it('поддерживает объекты с toJSON (AxiosHeaders-подобные)', () => {
    const axiosLike = { toJSON: (): Record<string, string> => ({ 'X-Page': '2' }) };
    const result = normalizeHeaders(axiosLike);
    expect(result['x-page']).toBe('2');
  });
});
