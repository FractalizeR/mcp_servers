/**
 * Тесты для BaseConnector.validateLaunchSpec
 *
 * Проверяем все ветки базовой валидации:
 * - пустая команда
 * - абсолютный путь команды (существует/не существует)
 * - `node` + поиск абсолютного скрипта в args (с Node-флагами и без)
 * - env-значения должны быть строками
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { BaseConnector } from '../../../src/connectors/base/base-connector.js';
import type { MCPClientInfo, ConnectionStatus } from '../../../src/types/client.types.js';
import type { ServerLaunchSpec } from '../../../src/types/launch.types.js';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: vi.fn(),
  };
});

/**
 * Минимальный наследник для тестирования невабстрактной части BaseConnector.
 */
class TestConnector extends BaseConnector {
  getClientInfo(): MCPClientInfo {
    return {
      name: 'test',
      displayName: 'Test',
      description: 'Test connector',
      configPath: '/tmp/test.json',
      platforms: ['darwin', 'linux', 'win32'],
    };
  }
  isInstalled(): Promise<boolean> {
    return Promise.resolve(true);
  }
  getStatus(): Promise<ConnectionStatus> {
    return Promise.resolve({ connected: false });
  }
  connect(_spec: ServerLaunchSpec): Promise<void> {
    return Promise.resolve();
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  getLaunchSpec(): Promise<ServerLaunchSpec | null> {
    return Promise.resolve(null);
  }
}

describe('BaseConnector.validateLaunchSpec', () => {
  let connector: TestConnector;

  beforeEach(() => {
    connector = new TestConnector();
    vi.mocked(fs.access).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает ошибку при пустой команде', async () => {
    const errors = await connector.validateLaunchSpec({ command: '', args: [], env: {} });
    expect(errors).toContain('Команда запуска (command) обязательна');
  });

  it('возвращает ошибку при whitespace-команде', async () => {
    const errors = await connector.validateLaunchSpec({ command: '   ', args: [], env: {} });
    expect(errors).toContain('Команда запуска (command) обязательна');
  });

  it('успешная валидация для абсолютного пути существующего файла', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const errors = await connector.validateLaunchSpec({
      command: '/usr/local/bin/server',
      args: [],
      env: {},
    });
    expect(errors).toEqual([]);
    expect(fs.access).toHaveBeenCalledWith('/usr/local/bin/server');
  });

  it('ошибка для абсолютного пути несуществующего файла', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    const errors = await connector.validateLaunchSpec({
      command: '/nonexistent/bin/server',
      args: [],
      env: {},
    });
    expect(errors).toContain('Файл команды не найден: /nonexistent/bin/server');
  });

  it('успешная валидация: node + первый абсолютный путь в args', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const errors = await connector.validateLaunchSpec({
      command: 'node',
      args: ['/abs/path/server.cjs'],
      env: {},
    });
    expect(errors).toEqual([]);
    expect(fs.access).toHaveBeenCalledWith('/abs/path/server.cjs');
  });

  it('node + Node-флаги перед скриптом → находит абсолютный скрипт', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const errors = await connector.validateLaunchSpec({
      command: 'node',
      args: ['--no-warnings', '--enable-source-maps', '/abs/path/server.cjs'],
      env: {},
    });
    expect(errors).toEqual([]);
    expect(fs.access).toHaveBeenCalledWith('/abs/path/server.cjs');
  });

  it('node без абсолютного пути в args → ошибка', async () => {
    const errors = await connector.validateLaunchSpec({
      command: 'node',
      args: ['--version'],
      env: {},
    });
    expect(errors).toContain('Для команды `node` не найден абсолютный путь к скрипту в args');
  });

  it('node + несуществующий абсолютный скрипт → ошибка', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
    const errors = await connector.validateLaunchSpec({
      command: 'node',
      args: ['/missing/server.cjs'],
      env: {},
    });
    expect(errors).toContain('Скрипт не найден: /missing/server.cjs');
  });

  it('относительная команда (например, npx) → не проверяет на диске', async () => {
    const errors = await connector.validateLaunchSpec({
      command: 'npx',
      args: ['some-package'],
      env: {},
    });
    expect(errors).toEqual([]);
    expect(fs.access).not.toHaveBeenCalled();
  });

  it('env с не-строковыми значениями → ошибка для каждого', async () => {
    const errors = await connector.validateLaunchSpec({
      command: 'npx',
      args: [],
      // @ts-expect-error: умышленно нарушаем типы для runtime-проверки
      env: { GOOD: 'ok', BAD_NUM: 42, BAD_BOOL: true },
    });
    expect(errors.some((e) => e.includes('env.BAD_NUM'))).toBe(true);
    expect(errors.some((e) => e.includes('env.BAD_BOOL'))).toBe(true);
    expect(errors.some((e) => e.includes('env.GOOD'))).toBe(false);
  });

  it('пустой env → ok', async () => {
    const errors = await connector.validateLaunchSpec({
      command: 'npx',
      args: [],
      env: {},
    });
    expect(errors).toEqual([]);
  });

  describe('cwd validation (H4)', () => {
    it('cwd: undefined → не проверяется', async () => {
      const errors = await connector.validateLaunchSpec({
        command: 'npx',
        args: [],
        env: {},
      });
      expect(errors).toEqual([]);
    });

    it('cwd: относительный путь → ошибка', async () => {
      const errors = await connector.validateLaunchSpec({
        command: 'npx',
        args: [],
        env: {},
        cwd: './relative/path',
      });
      expect(errors.some((e) => e.includes('должна быть абсолютным'))).toBe(true);
    });

    it('cwd: абсолютный путь, существует → ok', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const errors = await connector.validateLaunchSpec({
        command: 'npx',
        args: [],
        env: {},
        cwd: '/abs/dir',
      });
      expect(errors).toEqual([]);
      expect(fs.access).toHaveBeenCalledWith('/abs/dir');
    });

    it('cwd: абсолютный путь, не существует → ошибка', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const errors = await connector.validateLaunchSpec({
        command: 'npx',
        args: [],
        env: {},
        cwd: '/missing/dir',
      });
      expect(errors.some((e) => e.includes('cwd) не найдена'))).toBe(true);
    });
  });
});
