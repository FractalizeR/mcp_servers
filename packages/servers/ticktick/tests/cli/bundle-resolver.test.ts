/**
 * Тесты `defaultBundleResolver` для TickTick — сценарии с моками.
 *
 * Smoke-тест — в `bundle-resolver.smoke.test.ts` (vi.mock хойстится на файл).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateRequire, mockExistsSync } = vi.hoisted(() => {
  return {
    mockCreateRequire: vi.fn(),
    mockExistsSync: vi.fn(),
  };
});

vi.mock('node:module', async () => {
  const actual = await vi.importActual<typeof import('node:module')>('node:module');
  return {
    ...actual,
    createRequire: mockCreateRequire,
  };
});

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: mockExistsSync,
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

async function loadResolver() {
  vi.resetModules();
  const mod = await import('#cli/bundle-resolver.js');
  return mod.defaultBundleResolver;
}

describe('defaultBundleResolver (fallback path)', () => {
  it('createRequire бросает + fallback существует → возвращает fallback путь', async () => {
    mockCreateRequire.mockImplementation(() => ({
      resolve: () => {
        throw new Error('mock: primary specifier not resolvable');
      },
    }));
    mockExistsSync.mockReturnValue(true);

    const resolver = await loadResolver();
    const resolved = resolver();

    expect(resolved).toMatch(/ticktick\.bundle\.cjs$/);
  });
});

describe('defaultBundleResolver (полный fail)', () => {
  it('createRequire бросает + fallback не существует → ошибка с обоими путями', async () => {
    mockCreateRequire.mockImplementation(() => ({
      resolve: () => {
        throw new Error('mock: primary specifier missing');
      },
    }));
    mockExistsSync.mockReturnValue(false);

    const resolver = await loadResolver();

    expect(() => resolver()).toThrow(/Не удалось найти бандл/);
    try {
      resolver();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain('Primary');
      expect(message).toContain('Fallback');
      expect(message).toContain('mock: primary specifier missing');
      expect(message).toContain('ticktick.bundle.cjs');
    }
  });

  it('primary резолвится в несуществующий файл + fallback не существует → ошибка', async () => {
    mockCreateRequire.mockImplementation(() => ({
      resolve: () => '/nonexistent/primary/path/bundle.cjs',
    }));
    mockExistsSync.mockReturnValue(false);

    const resolver = await loadResolver();

    expect(() => resolver()).toThrow(/Не удалось найти бандл/);
    try {
      resolver();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain('файл не найден по пути');
      expect(message).toContain('/nonexistent/primary/path/bundle.cjs');
    }
  });
});
