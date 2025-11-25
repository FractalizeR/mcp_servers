/**
 * Базовые тесты конфигурации пакета yandex-wiki
 */

import { describe, it, expect } from 'vitest';

describe('Yandex Wiki Package Setup', () => {
  it('should export MCP constants', async () => {
    const { MCP_TOOL_PREFIX, YANDEX_WIKI_API_BASE } = await import('#constants');

    expect(MCP_TOOL_PREFIX).toBe('yw');
    expect(YANDEX_WIKI_API_BASE).toBe('https://api.wiki.yandex.net');
  });

  it('should have valid config constants', async () => {
    const constants = await import('#config/constants.js');

    expect(constants.DEFAULT_API_BASE).toBe('https://api.wiki.yandex.net');
    expect(constants.DEFAULT_LOG_LEVEL).toBe('info');
    expect(constants.DEFAULT_REQUEST_TIMEOUT).toBeGreaterThan(0);
    expect(constants.DEFAULT_RETRY_ATTEMPTS).toBeGreaterThan(0);
  });

  it('should export page schemas', async () => {
    const { PageIdSchema, PageSlugSchema } = await import('#common/schemas/index.js');

    expect(PageIdSchema).toBeDefined();
    expect(PageSlugSchema).toBeDefined();

    // Test PageIdSchema validation
    expect(PageIdSchema.safeParse(123).success).toBe(true);
    expect(PageIdSchema.safeParse(-1).success).toBe(false);
    expect(PageIdSchema.safeParse('abc').success).toBe(false);

    // Test PageSlugSchema validation
    expect(PageSlugSchema.safeParse('users/docs/readme').success).toBe(true);
    expect(PageSlugSchema.safeParse('').success).toBe(false);
  });

  it('should export fields schema', async () => {
    const { WikiFieldsSchema } = await import('#common/schemas/index.js');

    expect(WikiFieldsSchema).toBeDefined();
    expect(WikiFieldsSchema.safeParse('id,title,content').success).toBe(true);
  });
});
