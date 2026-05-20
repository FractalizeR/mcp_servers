/**
 * Тесты `getTickTickDoctorChecks` — доменные доктор-проверки TickTick.
 *
 * Отличие от tracker/wiki: в config.json проверяется `clientId` (НЕ `orgId`),
 * потому что TickTick использует OAuth-модель.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DoctorCheck } from '@fractalizer/mcp-cli';

const { mockCreateRequire, mockExistsSync, mockReadFile, mockAccess } = vi.hoisted(() => {
  return {
    mockCreateRequire: vi.fn(),
    mockExistsSync: vi.fn(),
    mockReadFile: vi.fn(),
    mockAccess: vi.fn(),
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

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    readFile: mockReadFile,
    access: mockAccess,
    default: {
      ...actual,
      readFile: mockReadFile,
      access: mockAccess,
    },
  };
});

beforeEach(() => {
  vi.resetAllMocks();
});

function findCheck(checks: DoctorCheck[], name: string): DoctorCheck {
  const c = checks.find((x) => x.name === name);
  if (!c) {
    throw new Error(`Doctor check '${name}' not found`);
  }
  return c;
}

async function loadChecks(): Promise<{
  bundleResolve: DoctorCheck;
  bundleAccessible: DoctorCheck;
  savedConfig: DoctorCheck;
  all: DoctorCheck[];
}> {
  vi.resetModules();
  const { getTickTickDoctorChecks } = await import('#cli/doctor-checks.js');
  const checks = getTickTickDoctorChecks();
  return {
    bundleResolve: findCheck(checks, 'bundle-resolve'),
    bundleAccessible: findCheck(checks, 'bundle-accessible'),
    savedConfig: findCheck(checks, 'config-file'),
    all: checks,
  };
}

function setupResolverSuccess(resolvedPath = '/fake/ticktick.bundle.cjs') {
  mockCreateRequire.mockImplementation(() => ({
    resolve: () => resolvedPath,
  }));
  mockExistsSync.mockReturnValue(true);
}

function setupResolverFailure() {
  mockCreateRequire.mockImplementation(() => ({
    resolve: () => {
      throw new Error('mock: primary not resolvable');
    },
  }));
  mockExistsSync.mockReturnValue(false);
}

describe('getTickTickDoctorChecks (структура)', () => {
  it('возвращает 3 проверки в правильном порядке', async () => {
    setupResolverSuccess();
    const { all } = await loadChecks();

    expect(all).toHaveLength(3);
    expect(all.map((c) => c.name)).toEqual(['bundle-resolve', 'bundle-accessible', 'config-file']);
  });

  it('каждая проверка имеет group="TickTick"', async () => {
    setupResolverSuccess();
    const { all } = await loadChecks();

    for (const c of all) {
      expect(c.group).toBe('TickTick');
    }
  });
});

describe('checkBundleResolvable (TickTick)', () => {
  it('ok когда resolver возвращает путь', async () => {
    setupResolverSuccess('/path/to/ticktick.bundle.cjs');
    const { bundleResolve } = await loadChecks();

    const result = await bundleResolve.run();

    expect(result.status).toBe('ok');
    expect(result.message).toContain('Путь к бандлу разрешён');
    expect(result.message).toContain('/path/to/ticktick.bundle.cjs');
  });

  it('fail когда resolver бросает', async () => {
    setupResolverFailure();
    const { bundleResolve } = await loadChecks();

    const result = await bundleResolve.run();

    expect(result.status).toBe('fail');
    expect(result.message).toBe('Не удалось разрешить путь к бандлу сервера');
    expect(result.hint).toMatch(/Соберите пакет|переустановите/);
    expect(result.details).toBeDefined();
    expect(result.details ?? []).not.toHaveLength(0);
  });
});

describe('checkBundleAccessible (TickTick)', () => {
  it('ok когда fs.access не кидает', async () => {
    setupResolverSuccess('/fake/ticktick.bundle.cjs');
    mockAccess.mockResolvedValue(undefined);
    const { bundleAccessible } = await loadChecks();

    const result = await bundleAccessible.run();

    expect(result.status).toBe('ok');
    expect(result.message).toContain('Файл бандла читаем');
  });

  it('fail когда fs.access кидает (ENOENT)', async () => {
    setupResolverSuccess('/fake/ticktick.bundle.cjs');
    mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    const { bundleAccessible } = await loadChecks();

    const result = await bundleAccessible.run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('Файл бандла недоступен на чтение');
    expect(result.hint).toMatch(/Пересоберите|переустановите/);
  });

  it('fail когда defaultBundleResolver падает раньше fs.access', async () => {
    setupResolverFailure();
    const { bundleAccessible } = await loadChecks();

    const result = await bundleAccessible.run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('Не удалось разрешить путь к бандлу');
  });
});

describe('checkSavedConfig (TickTick — проверяет clientId, не orgId)', () => {
  beforeEach(() => {
    setupResolverSuccess();
  });

  it('ok когда файл существует и содержит непустой clientId', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ clientId: 'oauth-client-id' }));
    const { savedConfig } = await loadChecks();

    const result = await savedConfig.run();

    expect(result.status).toBe('ok');
    expect(result.message).toContain('Конфигурация валидна');
    expect(result.message).toContain('oauth-client-id');
  });

  it('fail когда clientId пустая строка', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ clientId: '' }));
    const { savedConfig } = await loadChecks();

    const result = await savedConfig.run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('отсутствует или пуст `clientId`');
    expect(result.hint).toMatch(/connect|OAuth/);
  });

  it('fail когда clientId только пробелы', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ clientId: '   ' }));
    const { savedConfig } = await loadChecks();

    const result = await savedConfig.run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('отсутствует или пуст `clientId`');
  });

  it('fail когда clientId отсутствует', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ redirectUri: 'http://localhost/cb' }));
    const { savedConfig } = await loadChecks();

    const result = await savedConfig.run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('отсутствует или пуст `clientId`');
  });

  it('fail когда файл содержит невалидный JSON', async () => {
    mockReadFile.mockResolvedValue('{not valid json');
    const { savedConfig } = await loadChecks();

    const result = await savedConfig.run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('невалидный JSON');
    expect(result.hint).toMatch(/Удалите файл|connect/);
  });

  it('fail когда JSON-корень не объект (массив)', async () => {
    mockReadFile.mockResolvedValue('[]');
    const { savedConfig } = await loadChecks();

    const result = await savedConfig.run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('не является объектом');
  });

  it('warn когда файл не существует (ENOENT)', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    const { savedConfig } = await loadChecks();

    const result = await savedConfig.run();

    expect(result.status).toBe('warn');
    expect(result.message).toContain('Файл конфигурации не найден');
    expect(result.hint).toMatch(/mcp-ticktick-connect connect/);
  });

  it('fail при иных ошибках чтения (EACCES)', async () => {
    mockReadFile.mockRejectedValue(
      Object.assign(new Error('permission denied'), { code: 'EACCES' })
    );
    const { savedConfig } = await loadChecks();

    const result = await savedConfig.run();

    expect(result.status).toBe('fail');
    expect(result.message).toContain('Не удалось прочитать файл конфигурации');
    expect(result.details).toEqual(['permission denied']);
  });
});
