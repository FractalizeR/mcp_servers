/**
 * Тесты ConfigurableConnector.
 *
 * Покрытие:
 *  - JSON и TOML форматы, custom serverKey
 *  - getClientInfo (включая configPath как функция)
 *  - isInstalled через директорию конфига
 *  - connect: создаёт файл / мержит с существующим / сохраняет env как есть
 *  - disconnect: удаляет запись / noop при отсутствии файла
 *  - getStatus: пять сценариев из плана 1.4.1
 *  - getLaunchSpec: записанная spec / null если файла нет / null если сервера нет
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ConfigurableConnector,
  type ConnectorClientConfig,
} from '../../../src/connectors/base/configurable-connector.js';
import { FileManager } from '../../../src/utils/file-manager.js';

vi.mock('../../../src/utils/file-manager.js', () => ({
  FileManager: {
    exists: vi.fn(),
    ensureDir: vi.fn(),
    readJSON: vi.fn(),
    writeJSON: vi.fn(),
    readTOML: vi.fn(),
    writeTOML: vi.fn(),
    setPermissions: vi.fn(),
    getHomeDir: vi.fn(() => '/home/user'),
    resolvePath: vi.fn((p: string) => p),
  },
}));

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: vi.fn(),
  };
});

import * as fs from 'node:fs/promises';

const SERVER_NAME = 'mcp-server-yandex-tracker';

const baseJsonConfig: ConnectorClientConfig = {
  name: 'gemini',
  displayName: 'Gemini CLI',
  description: 'Gemini CLI для MCP',
  configPath: '/home/user/.gemini/settings.json',
  platforms: ['darwin', 'linux', 'win32'],
};

const tomlConfig: ConnectorClientConfig = {
  name: 'codex',
  displayName: 'Codex',
  description: 'Codex',
  configPath: '/home/user/.codex/config.toml',
  platforms: ['darwin', 'linux', 'win32'],
  serverKey: 'mcp_servers',
  configFormat: 'toml',
};

describe('ConfigurableConnector', () => {
  beforeEach(() => {
    vi.mocked(FileManager.exists).mockReset();
    vi.mocked(FileManager.ensureDir).mockReset();
    vi.mocked(FileManager.readJSON).mockReset();
    vi.mocked(FileManager.writeJSON).mockReset();
    vi.mocked(FileManager.readTOML).mockReset();
    vi.mocked(FileManager.writeTOML).mockReset();
    vi.mocked(fs.access).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientInfo', () => {
    it('возвращает поля из ConnectorClientConfig', () => {
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const info = c.getClientInfo();
      expect(info.name).toBe('gemini');
      expect(info.displayName).toBe('Gemini CLI');
      expect(info.configPath).toBe('/home/user/.gemini/settings.json');
      expect(info.platforms).toEqual(['darwin', 'linux', 'win32']);
    });

    it('configPath: функция вычисляется лениво', () => {
      const c = new ConfigurableConnector(SERVER_NAME, {
        ...baseJsonConfig,
        configPath: () => '/lazy/path/cfg.json',
      });
      expect(c.getClientInfo().configPath).toBe('/lazy/path/cfg.json');
    });

    it('возвращает checkCommand если задан', () => {
      const c = new ConfigurableConnector(SERVER_NAME, {
        ...baseJsonConfig,
        checkCommand: 'gemini --version',
      });
      expect(c.getClientInfo().checkCommand).toBe('gemini --version');
    });
  });

  describe('isInstalled', () => {
    it('true если директория конфига существует', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const ok = await c.isInstalled();
      expect(ok).toBe(true);
      expect(FileManager.exists).toHaveBeenCalledWith('/home/user/.gemini');
    });

    it('false если директория не существует', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      expect(await c.isInstalled()).toBe(false);
    });
  });

  describe('connect (JSON)', () => {
    it('создаёт новый файл если не существует', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);

      await c.connect({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: { TOKEN: 'sec' },
      });

      expect(FileManager.ensureDir).toHaveBeenCalledWith('/home/user/.gemini');
      expect(FileManager.writeJSON).toHaveBeenCalledWith(
        '/home/user/.gemini/settings.json',
        expect.objectContaining({
          mcpServers: {
            [SERVER_NAME]: {
              command: 'node',
              args: ['/abs/script.cjs'],
              env: { TOKEN: 'sec' },
            },
          },
        })
      );
    });

    it('мержит с существующей конфигурацией', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: {
          'other-server': { command: 'other', args: [], env: {} },
        },
      });
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);

      await c.connect({ command: 'node', args: ['/x.cjs'], env: {} });

      const writtenArg = vi.mocked(FileManager.writeJSON).mock.calls[0]?.[1] as Record<
        string,
        Record<string, unknown>
      >;
      expect(writtenArg['mcpServers']).toHaveProperty('other-server');
      expect(writtenArg['mcpServers']).toHaveProperty(SERVER_NAME);
    });

    it('сохраняет env как есть (включая то, что выглядит как секреты)', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);

      const env = { TOKEN: 'OAuth_token_secret_42', PUBLIC: 'org-id' };
      await c.connect({ command: 'node', args: ['/x.cjs'], env });

      const writtenArg = vi.mocked(FileManager.writeJSON).mock.calls[0]?.[1] as Record<
        string,
        Record<string, { env: Record<string, string> }>
      >;
      expect(writtenArg['mcpServers']?.[SERVER_NAME]?.env).toEqual(env);
    });

    it('добавляет mcpServers если ключ отсутствует в существующем файле', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({ otherSection: { foo: 'bar' } });
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      await c.connect({ command: 'node', args: ['/x.cjs'], env: {} });

      const writtenArg = vi.mocked(FileManager.writeJSON).mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(writtenArg['otherSection']).toEqual({ foo: 'bar' });
      expect(writtenArg['mcpServers']).toHaveProperty(SERVER_NAME);
    });
  });

  describe('connect (TOML)', () => {
    it('использует writeTOML и serverKey "mcp_servers"', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, tomlConfig);

      await c.connect({ command: 'node', args: ['/x.cjs'], env: {} });

      expect(FileManager.writeTOML).toHaveBeenCalledWith(
        '/home/user/.codex/config.toml',
        expect.objectContaining({
          mcp_servers: {
            [SERVER_NAME]: {
              command: 'node',
              args: ['/x.cjs'],
              env: {},
            },
          },
        })
      );
      expect(FileManager.writeJSON).not.toHaveBeenCalled();
    });

    it('читает существующий TOML и мержит', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readTOML).mockResolvedValue({
        mcp_servers: { other: { command: 'x', args: [], env: {} } },
      });
      const c = new ConfigurableConnector(SERVER_NAME, tomlConfig);
      await c.connect({ command: 'node', args: ['/x.cjs'], env: {} });

      const writtenArg = vi.mocked(FileManager.writeTOML).mock.calls[0]?.[1] as Record<
        string,
        Record<string, unknown>
      >;
      expect(writtenArg['mcp_servers']).toHaveProperty('other');
      expect(writtenArg['mcp_servers']).toHaveProperty(SERVER_NAME);
    });
  });

  describe('disconnect', () => {
    it('noop если файл не существует', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      await c.disconnect();
      expect(FileManager.writeJSON).not.toHaveBeenCalled();
      expect(FileManager.readJSON).not.toHaveBeenCalled();
    });

    it('удаляет запись из конфига и записывает обратно', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: {
          [SERVER_NAME]: { command: 'node', args: [], env: {} },
          other: { command: 'x', args: [], env: {} },
        },
      });
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      await c.disconnect();

      const writtenArg = vi.mocked(FileManager.writeJSON).mock.calls[0]?.[1] as Record<
        string,
        Record<string, unknown>
      >;
      expect(writtenArg['mcpServers']).not.toHaveProperty(SERVER_NAME);
      expect(writtenArg['mcpServers']).toHaveProperty('other');
    });

    it('noop если сервер отсутствует в конфиге (не пишет файл)', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: { other: { command: 'x', args: [], env: {} } },
      });
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      await c.disconnect();
      expect(FileManager.writeJSON).not.toHaveBeenCalled();
    });

    it('TOML: использует writeTOML', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readTOML).mockResolvedValue({
        mcp_servers: { [SERVER_NAME]: { command: 'node', args: [], env: {} } },
      });
      const c = new ConfigurableConnector(SERVER_NAME, tomlConfig);
      await c.disconnect();
      expect(FileManager.writeTOML).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('файл не существует → connected: false, error "Конфигурационный файл не найден"', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const status = await c.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('Конфигурационный файл не найден');
    });

    it('сервер отсутствует в конфиге → connected: false (без error)', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({ mcpServers: {} });
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const status = await c.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBeUndefined();
    });

    it('сервер есть + абсолютная команда существует → connected: true', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: {
          [SERVER_NAME]: { command: '/abs/server', args: [], env: {} },
        },
      });
      vi.mocked(fs.access).mockResolvedValue(undefined);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const status = await c.getStatus();
      expect(status.connected).toBe(true);
      expect(status.details?.configPath).toBe('/home/user/.gemini/settings.json');
    });

    it('сервер есть, но команда не найдена на диске → connected: false, error', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: {
          [SERVER_NAME]: { command: '/abs/missing', args: [], env: {} },
        },
      });
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const status = await c.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toContain('не найдена на диске');
      expect(status.error).toContain('/abs/missing');
    });

    it('node + абсолютный скрипт в args — проверяется скрипт', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: {
          [SERVER_NAME]: {
            command: 'node',
            args: ['--no-warnings', '/abs/script.cjs'],
            env: {},
          },
        },
      });
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const status = await c.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toContain('/abs/script.cjs');
    });

    it('относительная команда (npx) — резолва нет, считаем ok', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: {
          [SERVER_NAME]: { command: 'npx', args: ['some-pkg'], env: {} },
        },
      });
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const status = await c.getStatus();
      expect(status.connected).toBe(true);
      expect(fs.access).not.toHaveBeenCalled();
    });

    it('битый JSON → connected: false, error "Ошибка чтения конфига"', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockRejectedValue(new Error('Unexpected token <'));
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      const status = await c.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toContain('Ошибка чтения конфига');
      expect(status.error).toContain('Unexpected token');
    });
  });

  describe('getLaunchSpec', () => {
    it('возвращает spec если сервер записан', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: {
          [SERVER_NAME]: {
            command: 'node',
            args: ['/abs/script.cjs'],
            env: { K: 'v' },
          },
        },
      });
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      expect(await c.getLaunchSpec()).toEqual({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: { K: 'v' },
      });
    });

    it('null если файл не существует', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      expect(await c.getLaunchSpec()).toBeNull();
    });

    it('null если сервера нет в конфиге', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({ mcpServers: {} });
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      expect(await c.getLaunchSpec()).toBeNull();
    });

    it('null если чтение бросает исключение', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockRejectedValue(new Error('broken'));
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      expect(await c.getLaunchSpec()).toBeNull();
    });

    it('сохраняет и читает обратно cwd / disabled (H4)', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);

      await c.connect({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: {},
        cwd: '/abs/workdir',
        disabled: true,
      });

      const writtenArg = vi.mocked(FileManager.writeJSON).mock.calls[0]?.[1] as Record<
        string,
        Record<string, { cwd?: string; disabled?: boolean }>
      >;
      expect(writtenArg['mcpServers']?.[SERVER_NAME]?.cwd).toBe('/abs/workdir');
      expect(writtenArg['mcpServers']?.[SERVER_NAME]?.disabled).toBe(true);

      // Симулируем чтение того же файла
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readJSON).mockResolvedValue({
        mcpServers: {
          [SERVER_NAME]: {
            command: 'node',
            args: ['/abs/script.cjs'],
            env: {},
            cwd: '/abs/workdir',
            disabled: true,
          },
        },
      });
      const spec = await c.getLaunchSpec();
      expect(spec?.cwd).toBe('/abs/workdir');
      expect(spec?.disabled).toBe(true);
    });

    it('не пишет cwd/disabled когда они undefined (clean object)', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(false);
      const c = new ConfigurableConnector(SERVER_NAME, baseJsonConfig);
      await c.connect({ command: 'node', args: ['/x.cjs'], env: {} });
      const writtenArg = vi.mocked(FileManager.writeJSON).mock.calls[0]?.[1] as Record<
        string,
        Record<string, Record<string, unknown>>
      >;
      const entry = writtenArg['mcpServers']?.[SERVER_NAME] ?? {};
      expect('cwd' in entry).toBe(false);
      expect('disabled' in entry).toBe(false);
    });

    it('TOML: использует readTOML и custom serverKey', async () => {
      vi.mocked(FileManager.exists).mockResolvedValue(true);
      vi.mocked(FileManager.readTOML).mockResolvedValue({
        mcp_servers: {
          [SERVER_NAME]: { command: 'node', args: ['/x.cjs'], env: {} },
        },
      });
      const c = new ConfigurableConnector(SERVER_NAME, tomlConfig);
      const spec = await c.getLaunchSpec();
      expect(spec?.command).toBe('node');
      expect(FileManager.readTOML).toHaveBeenCalled();
      expect(FileManager.readJSON).not.toHaveBeenCalled();
    });
  });
});
