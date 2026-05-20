/**
 * Тесты ClaudeCodeConnector.
 *
 * Фокус — парсинг вывода `claude mcp list` (7 сценариев из плана 1.4.1) и
 * парсинг `claude mcp get`. Фикстуры сняты на Claude Code CLI 2.x.
 *
 * Все обращения к `CommandExecutor` мокаются полностью.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClaudeCodeConnector } from '../../../src/connectors/claude-code/claude-code.connector.js';
import { CommandExecutor } from '../../../src/utils/command-executor.js';

vi.mock('../../../src/utils/command-executor.js', () => ({
  CommandExecutor: {
    exec: vi.fn(),
    execSilent: vi.fn(),
    execInteractive: vi.fn(),
    isCommandAvailable: vi.fn(),
  },
}));

const SERVER_NAME = 'fractalizer_mcp_yandex_tracker';

describe('ClaudeCodeConnector', () => {
  let connector: ClaudeCodeConnector;

  beforeEach(() => {
    connector = new ClaudeCodeConnector(SERVER_NAME);
    vi.mocked(CommandExecutor.exec).mockReset();
    vi.mocked(CommandExecutor.execInteractive).mockReset();
    vi.mocked(CommandExecutor.isCommandAvailable).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('конструктор и метаданные', () => {
    it('принимает serverName и возвращает корректные ClientInfo', () => {
      const info = connector.getClientInfo();
      expect(info.name).toBe('claude-code');
      expect(info.displayName).toBe('Claude Code');
      expect(info.checkCommand).toBe('claude --version');
      expect(info.platforms).toEqual(['darwin', 'linux', 'win32']);
    });

    it('isInstalled проксируется в CommandExecutor.isCommandAvailable', async () => {
      vi.mocked(CommandExecutor.isCommandAvailable).mockReturnValue(true);
      const ok = await connector.isInstalled();
      expect(ok).toBe(true);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('claude');
    });
  });

  // Tested on Claude Code CLI 2.x (формат `<name>: <tail> - <icon> <status>`)
  describe('парсинг `claude mcp list` (7 сценариев)', () => {
    it('сценарий 1: ✓ Connected → connected: true', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue(
        `\n${SERVER_NAME}: mcp-server-yandex-tracker  - ✓ Connected\n`
      );
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);
      expect(status.error).toBeUndefined();
      expect(status.details?.configPath).toBe('managed by claude mcp');
    });

    it('сценарий 2: ✗ Failed → connected: false, error без префикса', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue(
        `\n${SERVER_NAME}: node /invalid/path - ✗ Failed to connect\n`
      );
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('Failed to connect');
    });

    it('сценарий 3: ! Needs authentication → connected: false, error без префикса', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue(
        `\n${SERVER_NAME}: https://example.com/mcp - ! Needs authentication\n`
      );
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('Needs authentication');
    });

    it('сценарий 4: неизвестный хвост → connected: true, error "Unknown state: <raw>"', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue(`\n${SERVER_NAME}: something - ⏳ Pending\n`);
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);
      expect(status.error).toMatch(/Unknown state/);
      expect(status.error).toContain('⏳ Pending');
    });

    it('сценарий 5: сервер отсутствует в выводе → connected: false (без error)', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue('\nother_server: smth - ✓ Connected\n');
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBeUndefined();
    });

    it('сценарий 6: `claude mcp list` падает с исключением → error со словом "Ошибка проверки статуса"', async () => {
      vi.mocked(CommandExecutor.exec).mockImplementation(() => {
        throw new Error('Command failed: claude mcp list');
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toContain('Ошибка проверки статуса');
      expect(status.error).toContain('Command failed');
    });

    it('сценарий 7: таймаут — exec бросает "Timeout: ..." → error содержит "Timeout"', async () => {
      // Эмулируем реальное поведение CommandExecutor при таймауте:
      // execSync убивает SIGKILL, exec оборачивает в Error('Timeout: ...')
      vi.mocked(CommandExecutor.exec).mockImplementation(() => {
        throw new Error('Timeout: claude mcp list exceeded 5000ms');
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toContain('Timeout');
      expect(status.error).toContain('5000ms');
    });

    it('передаёт timeout 5000 в CommandExecutor.exec', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue('');
      await connector.getStatus();
      expect(CommandExecutor.exec).toHaveBeenCalledWith(
        'claude mcp list',
        expect.objectContaining({ timeout: 5000 })
      );
    });

    it('корректный матчинг при нескольких серверах в выводе', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue(
        `\nother: smth - ✗ Failed\n${SERVER_NAME}: node /abs/script.cjs - ✓ Connected\nthird: foo - ✓ Connected\n`
      );
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);
      expect(status.error).toBeUndefined();
    });
  });

  describe('connect', () => {
    it('формирует команду claude mcp add со всеми env и args', async () => {
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue(undefined);
      await connector.connect({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: { TOKEN: 'sec', ORG: 'org-1' },
      });
      expect(CommandExecutor.execInteractive).toHaveBeenCalledTimes(1);
      const [cmd, args] = vi.mocked(CommandExecutor.execInteractive).mock.calls[0]!;
      expect(cmd).toBe('claude');
      expect(args).toContain('mcp');
      expect(args).toContain('add');
      expect(args).toContain(SERVER_NAME);
      expect(args).toContain('--env');
      expect(args).toContain('TOKEN=sec');
      expect(args).toContain('ORG=org-1');
      expect(args).toContain('--');
      // Команда + аргументы после `--`
      const sepIdx = args.indexOf('--');
      expect(args.slice(sepIdx + 1)).toEqual(['node', '/abs/script.cjs']);
    });

    it('connect с пустым env → без флагов --env', async () => {
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue(undefined);
      await connector.connect({ command: 'node', args: ['/abs/script.cjs'], env: {} });
      const [, args] = vi.mocked(CommandExecutor.execInteractive).mock.calls[0]!;
      expect(args.includes('--env')).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('вызывает claude mcp remove с именем', async () => {
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue(undefined);
      await connector.disconnect();
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'remove',
        SERVER_NAME,
      ]);
    });
  });

  describe('getLaunchSpec через `claude mcp get`', () => {
    it('парсит корректный stdio-вывод', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue(
        [
          `${SERVER_NAME}`,
          '  Type: stdio',
          '  Command: node',
          '  Args: /abs/script.cjs',
          '  Environment: TOKEN=sec, ORG=org-1',
        ].join('\n')
      );
      const spec = await connector.getLaunchSpec();
      expect(spec).toEqual({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: { TOKEN: 'sec', ORG: 'org-1' },
      });
    });

    it('возвращает null для http/sse сервера', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue(
        [`server`, '  Type: http', '  Command: irrelevant'].join('\n')
      );
      const spec = await connector.getLaunchSpec();
      expect(spec).toBeNull();
    });

    it('возвращает null при отсутствии Command', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue('Type: stdio\nArgs: a');
      const spec = await connector.getLaunchSpec();
      expect(spec).toBeNull();
    });

    it('возвращает null если CommandExecutor бросает', async () => {
      vi.mocked(CommandExecutor.exec).mockImplementation(() => {
        throw new Error('not found');
      });
      const spec = await connector.getLaunchSpec();
      expect(spec).toBeNull();
    });

    it('экранирует имя сервера с пробелами через одинарные кавычки', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue('Type: stdio\nCommand: node\nArgs:');
      const c = new ClaudeCodeConnector("name with 'quote");
      await c.getLaunchSpec();
      const [cmd] = vi.mocked(CommandExecutor.exec).mock.calls[0]!;
      // Должно быть обёрнуто в одинарные кавычки с экранированием
      expect(cmd).toContain("'name with '\\''quote'");
    });

    it('возвращает пустые args/env когда полей нет', async () => {
      vi.mocked(CommandExecutor.exec).mockReturnValue('Command: /abs/server');
      const spec = await connector.getLaunchSpec();
      expect(spec).toEqual({ command: '/abs/server', args: [], env: {} });
    });
  });
});
