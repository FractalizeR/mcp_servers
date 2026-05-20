/**
 * Smoke-тесты `defaultBundleResolver` для Yandex Wiki без моков.
 *
 * Изолированы в отдельный файл от `bundle-resolver.test.ts` (там vi.mock
 * хойстится на весь файл).
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defaultBundleResolver } from '#cli/bundle-resolver.js';

describe('defaultBundleResolver (smoke, Yandex Wiki)', () => {
  it('в монорепо возвращает существующий путь к yandex-wiki.bundle.cjs', () => {
    const resolved = defaultBundleResolver();

    expect(resolved).toMatch(/yandex-wiki\.bundle\.cjs$/);
    expect(existsSync(resolved)).toBe(true);
  });

  it('исходник bundle-resolver.ts не содержит __dirname в коде (ESM-проверка)', () => {
    const sourcePath = fileURLToPath(new URL('../../src/cli/bundle-resolver.ts', import.meta.url));
    const raw = readFileSync(sourcePath, 'utf8');

    const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    const noLine = noBlock.replace(/\/\/[^\n]*/g, '');

    expect(noLine).not.toContain('__dirname');
  });
});
