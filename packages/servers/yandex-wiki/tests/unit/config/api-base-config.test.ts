import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '#config';

describe('API base configuration (YANDEX_WIKI_API_BASE)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.YANDEX_WIKI_TOKEN = 'test-token';
    process.env.YANDEX_ORG_ID = 'test-org';
    delete process.env.YANDEX_WIKI_API_BASE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses the default API base when the variable is not set', () => {
    const config = loadConfig();
    expect(config.apiBase).toBe('https://api.wiki.yandex.net');
  });

  it('ignores an empty value and falls back to the default (empty == unset)', () => {
    process.env.YANDEX_WIKI_API_BASE = '';
    const config = loadConfig();
    expect(config.apiBase).toBe('https://api.wiki.yandex.net');
  });

  it('ignores a whitespace-only value and falls back to the default', () => {
    process.env.YANDEX_WIKI_API_BASE = '   ';
    const config = loadConfig();
    expect(config.apiBase).toBe('https://api.wiki.yandex.net');
  });

  it('uses the provided value when the variable is set', () => {
    process.env.YANDEX_WIKI_API_BASE = 'http://127.0.0.1:34567';
    const config = loadConfig();
    expect(config.apiBase).toBe('http://127.0.0.1:34567');
  });

  it('trims surrounding whitespace from the provided value', () => {
    process.env.YANDEX_WIKI_API_BASE = '  http://127.0.0.1:34567  ';
    const config = loadConfig();
    expect(config.apiBase).toBe('http://127.0.0.1:34567');
  });
});
