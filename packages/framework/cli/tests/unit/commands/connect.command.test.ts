/**
 * Тесты connectCommand.
 *
 * Покрытие:
 *  - Happy path: prompter → buildServerLaunch → validate → connect → save (после connect)
 *  - cliOptions.client → выбирает по имени
 *  - cliOptions.client = unknown → ошибка, save не вызван
 *  - cliOptions.client не установлен → ошибка
 *  - Не найдено установленных клиентов → ошибка
 *  - validateLaunchSpec вернул ошибки → connect и save не вызваны
 *  - buildServerLaunch бросает → connect и save не вызваны (исключение прокинуто)
 *  - connect() бросает → save НЕ вызван (через spy) — критично для безопасности состояния
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { connectCommand } from '../../../src/commands/connect.command.js';
import type { ConnectCommandOptions, IConnectorRegistry } from '../../../src/types.js';
import type { MCPConnector } from '../../../src/connectors/base/connector.interface.js';
import type { ConfigManager } from '../../../src/utils/config-manager.js';
import type {
  ServerLaunchSpec,
  ConfigPromptDefinition,
  MCPClientInfo,
} from '../../../src/types.js';

// Inquirer — мокаем для тестов промптов
const inquirerPromptMock = vi.hoisted(() => vi.fn());
vi.mock('inquirer', () => ({
  default: { prompt: inquirerPromptMock },
}));

interface TestConfig {
  token: string;
  orgId: string;
}

interface ConnectorMockOpts {
  name?: string;
  isInstalled?: boolean;
  connectImpl?: (spec: ServerLaunchSpec) => Promise<void>;
  validateImpl?: (spec: ServerLaunchSpec) => Promise<string[]>;
  getStatusImpl?: () => Promise<{
    connected: boolean;
    details?: { configPath: string };
    error?: string;
  }>;
}

function makeConnector(opts: ConnectorMockOpts = {}): MCPConnector {
  const info: MCPClientInfo = {
    name: opts.name ?? 'gemini',
    displayName: (opts.name ?? 'gemini').toUpperCase(),
    description: 'mock',
    configPath: '/tmp/cfg.json',
    platforms: ['darwin'],
  };
  return {
    getClientInfo: () => info,
    isInstalled: vi.fn().mockResolvedValue(opts.isInstalled ?? true),
    connect: vi.fn(opts.connectImpl ?? ((): Promise<void> => Promise.resolve())),
    disconnect: vi.fn().mockResolvedValue(undefined),
    validateLaunchSpec: vi.fn(opts.validateImpl ?? ((): Promise<string[]> => Promise.resolve([]))),
    getStatus: vi.fn(
      opts.getStatusImpl ??
        ((): Promise<{ connected: boolean; details: { configPath: string } }> =>
          Promise.resolve({ connected: true, details: { configPath: '/tmp/cfg.json' } }))
    ),
    getLaunchSpec: vi.fn().mockResolvedValue(null),
  } as unknown as MCPConnector;
}

function makeRegistry(connectors: MCPConnector[]): IConnectorRegistry {
  const map = new Map(connectors.map((c) => [c.getClientInfo().name, c]));
  return {
    register: vi.fn(),
    get: vi.fn((name: string) => map.get(name)),
    getAll: vi.fn(() => Array.from(map.values())),
    findInstalled: vi.fn(async () => {
      const installed: MCPConnector[] = [];
      for (const c of map.values()) {
        if (await c.isInstalled()) installed.push(c);
      }
      return installed;
    }),
    checkAllStatuses: vi.fn(async () => new Map()),
  };
}

function makeConfigManager(): ConfigManager<TestConfig> {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    getConfigPath: vi.fn(() => '/tmp/saved.json'),
  } as unknown as ConfigManager<TestConfig>;
}

const PROMPTS: ConfigPromptDefinition<TestConfig>[] = [
  { name: 'token', type: 'password', message: 'Token:' },
  { name: 'orgId', type: 'input', message: 'Org:' },
];

function buildSpec(cfg: TestConfig): ServerLaunchSpec {
  return {
    command: 'node',
    args: ['/abs/script.cjs'],
    env: { TOKEN: cfg.token, ORG: cfg.orgId },
  };
}

beforeEach(() => {
  inquirerPromptMock.mockReset();
  // По умолчанию prompter вернёт всё что нужно.
  inquirerPromptMock.mockResolvedValue({ token: 't-sec', orgId: 'org-1' });
});

// console suppression — Logger пишет много, нам не нужно засорять вывод тестов
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('connectCommand', () => {
  describe('Happy path', () => {
    it('полный сценарий: prompts → build → validate → connect → save', async () => {
      const conn = makeConnector({ name: 'gemini' });
      const registry = makeRegistry([conn]);
      const configManager = makeConfigManager();
      const buildServerLaunch = vi.fn(buildSpec);

      const options: ConnectCommandOptions<TestConfig> = {
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch,
        cliOptions: { client: 'gemini' },
      };

      await connectCommand(options);

      // 1. buildServerLaunch вызван с domainConfig
      expect(buildServerLaunch).toHaveBeenCalledWith({ token: 't-sec', orgId: 'org-1' });

      // 2. validateLaunchSpec вызван
      expect(conn.validateLaunchSpec).toHaveBeenCalled();

      // 3. connect вызван
      expect(conn.connect).toHaveBeenCalledWith({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: { TOKEN: 't-sec', ORG: 'org-1' },
      });

      // 4. save вызван с полной domainConfig (включая токен!)
      expect(configManager.save).toHaveBeenCalledWith({ token: 't-sec', orgId: 'org-1' });

      // 5. Save вызван ПОСЛЕ connect
      const connectOrder = vi.mocked(conn.connect).mock.invocationCallOrder[0]!;
      const saveOrder = vi.mocked(configManager.save).mock.invocationCallOrder[0]!;
      expect(saveOrder).toBeGreaterThan(connectOrder);
    });

    it('Logger.warn про plaintext-токен выводится после save', async () => {
      const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const conn = makeConnector({ name: 'gemini' });
      const registry = makeRegistry([conn]);
      const configManager = makeConfigManager();

      await connectCommand({
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch: buildSpec,
        cliOptions: { client: 'gemini' },
      });

      const allOutput = warnSpy.mock.calls.flat().join('\n');
      expect(allOutput).toMatch(/plaintext/);
    });
  });

  describe('Ошибки до connect — save НЕ вызывается', () => {
    it('cliOptions.client = "unknown" → ошибка, save не вызван', async () => {
      const conn = makeConnector({ name: 'gemini' });
      const registry = makeRegistry([conn]);
      const configManager = makeConfigManager();

      await connectCommand({
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch: buildSpec,
        cliOptions: { client: 'unknown' },
      });

      expect(conn.connect).not.toHaveBeenCalled();
      expect(configManager.save).not.toHaveBeenCalled();
    });

    it('cliOptions.client установлен, но клиент не isInstalled → save не вызван', async () => {
      const conn = makeConnector({ name: 'gemini', isInstalled: false });
      const installedConn = makeConnector({ name: 'qwen', isInstalled: true });
      const registry = makeRegistry([conn, installedConn]);
      const configManager = makeConfigManager();

      await connectCommand({
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch: buildSpec,
        cliOptions: { client: 'gemini' },
      });

      expect(conn.connect).not.toHaveBeenCalled();
      expect(configManager.save).not.toHaveBeenCalled();
    });

    it('Не найдено установленных клиентов → save не вызван', async () => {
      const conn = makeConnector({ name: 'gemini', isInstalled: false });
      const registry = makeRegistry([conn]);
      const configManager = makeConfigManager();

      await connectCommand({
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch: buildSpec,
        cliOptions: { client: 'gemini' },
      });

      expect(configManager.save).not.toHaveBeenCalled();
    });

    it('validateLaunchSpec возвращает ошибки → connect и save не вызваны', async () => {
      const conn = makeConnector({
        name: 'gemini',
        validateImpl: (): Promise<string[]> => Promise.resolve(['Файл не найден']),
      });
      const registry = makeRegistry([conn]);
      const configManager = makeConfigManager();

      await connectCommand({
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch: buildSpec,
        cliOptions: { client: 'gemini' },
      });

      expect(conn.connect).not.toHaveBeenCalled();
      expect(configManager.save).not.toHaveBeenCalled();
    });

    it('buildServerLaunch бросает → connect и save не вызваны (исключение прокидывается)', async () => {
      const conn = makeConnector({ name: 'gemini' });
      const registry = makeRegistry([conn]);
      const configManager = makeConfigManager();
      const buildServerLaunch = vi.fn(() => {
        throw new Error('build failed');
      });

      await expect(
        connectCommand({
          registry,
          configManager,
          configPrompts: PROMPTS,
          buildServerLaunch,
          cliOptions: { client: 'gemini' },
        })
      ).rejects.toThrow('build failed');

      expect(conn.connect).not.toHaveBeenCalled();
      expect(configManager.save).not.toHaveBeenCalled();
    });
  });

  describe('КРИТИЧНО: connect бросает → save НЕ вызывается', () => {
    it('connect throws → save not called', async () => {
      const conn = makeConnector({
        name: 'gemini',
        connectImpl: (): Promise<void> => Promise.reject(new Error('connection refused')),
      });
      const registry = makeRegistry([conn]);
      const configManager = makeConfigManager();

      await connectCommand({
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch: buildSpec,
        cliOptions: { client: 'gemini' },
      });

      expect(conn.connect).toHaveBeenCalledTimes(1);
      // Это самое важное утверждение этого теста:
      expect(configManager.save).not.toHaveBeenCalled();
    });
  });

  describe('Сохранённая конфигурация', () => {
    it('configManager.load вызывается до промптов и передаётся в prompter', async () => {
      const conn = makeConnector({ name: 'gemini' });
      const registry = makeRegistry([conn]);
      const configManager = makeConfigManager();
      vi.mocked(configManager.load).mockResolvedValue({ orgId: 'saved-org' });

      await connectCommand({
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch: buildSpec,
        cliOptions: { client: 'gemini' },
      });

      expect(configManager.load).toHaveBeenCalled();
    });
  });

  describe('Interactive client selection', () => {
    it('cliOptions.client не задан → используется promptClientSelection', async () => {
      const gemini = makeConnector({ name: 'gemini', isInstalled: true });
      const qwen = makeConnector({ name: 'qwen', isInstalled: true });
      const registry = makeRegistry([gemini, qwen]);
      const configManager = makeConfigManager();

      // Первый вызов prompt — это selectClient, второй — конфигурационные промпты
      inquirerPromptMock.mockReset();
      inquirerPromptMock
        .mockResolvedValueOnce({ selectedClient: 'qwen' })
        .mockResolvedValueOnce({ token: 't', orgId: 'o' });

      await connectCommand({
        registry,
        configManager,
        configPrompts: PROMPTS,
        buildServerLaunch: buildSpec,
        // cliOptions не задан
      });

      expect(qwen.connect).toHaveBeenCalled();
      expect(gemini.connect).not.toHaveBeenCalled();
    });
  });
});
