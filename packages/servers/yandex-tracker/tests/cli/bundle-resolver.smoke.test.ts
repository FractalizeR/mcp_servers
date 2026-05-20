/**
 * Smoke-тесты `defaultBundleResolver` без моков native-модулей.
 *
 * Изолированы в отдельный файл, потому что `vi.mock('node:module')` хойстится
 * на весь test-файл и ломает реальный createRequire.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defaultBundleResolver } from '#cli/bundle-resolver.js';

describe('defaultBundleResolver (smoke)', () => {
  it('в монорепо возвращает существующий путь к yandex-tracker.bundle.cjs', () => {
    // Smoke: бандл собран (см. dist/yandex-tracker.bundle.cjs). Если падает —
    // запустить `npm run build` для tracker.
    const resolved = defaultBundleResolver();

    expect(resolved).toMatch(/yandex-tracker\.bundle\.cjs$/);
    expect(existsSync(resolved)).toBe(true);
  });

  it('исходник bundle-resolver.ts не содержит __dirname в коде (ESM-проверка)', () => {
    // Проверяем именно code, не комментарии: вырезаем // ... \n и /* ... */
    // перед проверкой. Это даёт защиту от случайного использования __dirname
    // в runtime коде (но допускает упоминание в jsdoc).
    const sourcePath = fileURLToPath(new URL('../../src/cli/bundle-resolver.ts', import.meta.url));
    const raw = readFileSync(sourcePath, 'utf8');

    // Удаляем /* ... */ блочные комментарии (включая /** jsdoc */).
    const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    // Удаляем // ... до конца строки.
    const noLine = noBlock.replace(/\/\/[^\n]*/g, '');

    expect(noLine).not.toContain('__dirname');
  });
});
