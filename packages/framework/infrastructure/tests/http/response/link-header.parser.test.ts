/**
 * Unit тесты для parseLinkHeader (RFC 5988)
 */

import { describe, it, expect } from 'vitest';
import { parseLinkHeader } from '@fractalizer/mcp-infrastructure/http/response/link-header.parser.js';

describe('parseLinkHeader', () => {
  it('возвращает пустой объект для undefined/пустой строки', () => {
    expect(parseLinkHeader(undefined)).toEqual({});
    expect(parseLinkHeader('')).toEqual({});
  });

  it('парсит одиночный rel="next"', () => {
    const result = parseLinkHeader('<https://api/issues?page=2>; rel="next"');
    expect(result['next']).toBe('https://api/issues?page=2');
  });

  it('парсит несколько rel в одном заголовке', () => {
    const header =
      '<https://api/issues?page=2>; rel="next", <https://api/issues?{&page}>; rel="seek"';
    const result = parseLinkHeader(header);
    expect(result['next']).toBe('https://api/issues?page=2');
    expect(result['seek']).toBe('https://api/issues?{&page}');
  });

  it('не разрывает URL с запятыми в query (expand=a,b)', () => {
    const header = '<https://api/issues?expand=a,b,c&page=2>; rel="next"';
    const result = parseLinkHeader(header);
    expect(result['next']).toBe('https://api/issues?expand=a,b,c&page=2');
  });

  it('обрабатывает rel без кавычек', () => {
    const result = parseLinkHeader('<https://api/x>; rel=next');
    expect(result['next']).toBe('https://api/x');
  });

  it('игнорирует записи без rel', () => {
    const result = parseLinkHeader('<https://api/x>; title="foo"');
    expect(result['next']).toBeUndefined();
  });

  it('rel регистронезависим (RFC 5988): rel="Next" → ключ next', () => {
    const result = parseLinkHeader('<https://api/x?page=2>; rel="Next"');
    expect(result['next']).toBe('https://api/x?page=2');
  });

  it('multi-token rel ("next prev") регистрируется под каждым токеном', () => {
    const result = parseLinkHeader('<https://api/x?page=2>; rel="next prev"');
    expect(result['next']).toBe('https://api/x?page=2');
    expect(result['prev']).toBe('https://api/x?page=2');
  });
});
