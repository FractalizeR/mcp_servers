/**
 * Тесты ClaudeCodeConnector.
 *
 * Покрывает:
 *   - парсинг `claude mcp list` (8 сценариев),
 *   - парсинг `claude mcp get` (включая многострочный/legacy Environment),
 *   - управление scope (`user` / `project` / `local`) в connect/disconnect/getStatus,
 *   - детект коллизии scope при connect и итеративную очистку при disconnect.
 *
 * Все обращения к `CommandExecutor` мокаются полностью.
 * Фикстуры сняты на Claude Code CLI 2.x.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClaudeCodeConnector } from '../../../src/connectors/claude-code/claude-code.connector.js';
import { CommandExecutor } from '../../../src/utils/command-executor.js';

vi.mock('../../../src/utils/command-executor.js', () => ({
  CommandExecutor: {
    exec: vi.fn(),
    execFile: vi.fn(),
    execSilent: vi.fn(),
    execInteractive: vi.fn(),
    isCommandAvailable: vi.fn(),
  },
}));

const SERVER_NAME = 'fractalizer_mcp_yandex_tracker';

/**
 * Фикстура многострочного вывода `claude mcp get`.
 * `scope` определяет содержимое строки `Scope:`.
 */
function buildGetOutput(opts: {
  scope?: 'local' | 'user' | 'project';
  command?: string;
  args?: string;
  envLines?: string[];
}): string {
  const scopeLabels = {
    local: 'Local config (private to you in this project)',
    user: 'User config (available in all your projects)',
    project: 'Project config (.mcp.json)',
  } as const;
  const lines: string[] = [`${SERVER_NAME}:`];
  if (opts.scope) lines.push(`  Scope: ${scopeLabels[opts.scope]}`);
  lines.push('  Status: ✓ Connected', '  Type: stdio');
  lines.push(`  Command: ${opts.command ?? 'node'}`);
  lines.push(`  Args: ${opts.args ?? '/abs/script.cjs'}`);
  if (opts.envLines && opts.envLines.length > 0) {
    lines.push('  Environment:');
    for (const line of opts.envLines) lines.push(`    ${line}`);
  }
  return lines.join('\n');
}

/**
 * Настроить execFile так, чтобы `claude mcp list` возвращал {@link listOutput},
 * а `claude mcp get <name>` — {@link getOutput} (или бросал, если null).
 */
function mockExecFileSplit(opts: { listOutput?: string; getOutput?: string | null }): void {
  vi.mocked(CommandExecutor.execFile).mockImplementation((_cmd, argsArg) => {
    const args = argsArg ?? [];
    if (args[1] === 'get') {
      if (opts.getOutput === null) {
        throw new Error('not found');
      }
      return opts.getOutput ?? '';
    }
    // mcp list
    return opts.listOutput ?? '';
  });
}

describe('ClaudeCodeConnector', () => {
  let connector: ClaudeCodeConnector;

  beforeEach(() => {
    connector = new ClaudeCodeConnector(SERVER_NAME);
    vi.mocked(CommandExecutor.exec).mockReset();
    vi.mocked(CommandExecutor.execFile).mockReset();
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
  describe('парсинг `claude mcp list` (status)', () => {
    it('сценарий 1: ✓ Connected → connected: true, details.configPath, details.scope из get', async () => {
      mockExecFileSplit({
        listOutput: `\n${SERVER_NAME}: mcp-server-yandex-tracker  - ✓ Connected\n`,
        getOutput: buildGetOutput({ scope: 'user' }),
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);
      expect(status.error).toBeUndefined();
      expect(status.details?.configPath).toBe('managed by claude mcp');
      expect(status.details?.scope).toBe('user');
    });

    it('сценарий 1b: ✓ Connected + get без Scope-строки → scope undefined', async () => {
      mockExecFileSplit({
        listOutput: `\n${SERVER_NAME}: cmd - ✓ Connected\n`,
        getOutput: buildGetOutput({}), // нет scope-строки
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);
      expect(status.details?.scope).toBeUndefined();
    });

    it('сценарий 2: ✗ Failed → connected: false, error без префикса', async () => {
      mockExecFileSplit({
        listOutput: `\n${SERVER_NAME}: node /invalid/path - ✗ Failed to connect\n`,
        getOutput: buildGetOutput({ scope: 'local' }),
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('Failed to connect');
      // details есть → scope подмешивается даже для failed-записи (помогает doctor-диагностике)
      expect(status.details?.scope).toBe('local');
    });

    it('сценарий 3: ! Needs authentication → connected: false, error без префикса', async () => {
      mockExecFileSplit({
        listOutput: `\n${SERVER_NAME}: https://example.com/mcp - ! Needs authentication\n`,
        getOutput: buildGetOutput({ scope: 'project' }),
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBe('Needs authentication');
      expect(status.details?.scope).toBe('project');
    });

    it('сценарий 4: неизвестный хвост → connected: false, error "Unknown state: <raw>"', async () => {
      mockExecFileSplit({
        listOutput: `\n${SERVER_NAME}: something - ⏳ Pending\n`,
        getOutput: buildGetOutput({ scope: 'user' }),
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toMatch(/Unknown state/);
      expect(status.error).toContain('⏳ Pending');
    });

    it('сценарий 5: сервер отсутствует в выводе → connected: false, без details, get не вызывается', async () => {
      vi.mocked(CommandExecutor.execFile).mockImplementation((_cmd, argsArg) => {
        const args = argsArg ?? [];
        if (args[1] === 'get') throw new Error('get must not be called for unknown server');
        return 'other_server: smth - ✓ Connected\n';
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBeUndefined();
      expect(status.details).toBeUndefined();
    });

    it('сценарий 6: `claude mcp list` падает с исключением → error со словом "Ошибка проверки статуса"', async () => {
      vi.mocked(CommandExecutor.execFile).mockImplementation((_cmd, argsArg) => {
        const args = argsArg ?? [];
        if (args[1] === 'list') throw new Error('Command failed: claude mcp list');
        return '';
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toContain('Ошибка проверки статуса');
      expect(status.error).toContain('Command failed');
    });

    it('сценарий 7: таймаут list — execFile бросает "Timeout: ..." → error содержит "Timeout"', async () => {
      vi.mocked(CommandExecutor.execFile).mockImplementation((_cmd, argsArg) => {
        const args = argsArg ?? [];
        if (args[1] === 'list') throw new Error('Timeout: claude mcp list exceeded 5000ms');
        return '';
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toContain('Timeout');
      expect(status.error).toContain('5000ms');
    });

    it('передаёт claude/mcp/list как массив + timeout 5000 в CommandExecutor.execFile', async () => {
      mockExecFileSplit({ listOutput: '', getOutput: null });
      await connector.getStatus();
      expect(CommandExecutor.execFile).toHaveBeenCalledWith(
        'claude',
        ['mcp', 'list'],
        expect.objectContaining({ timeout: 5000 })
      );
    });

    it('корректный матчинг при нескольких серверах в выводе', async () => {
      mockExecFileSplit({
        listOutput: `\nother: smth - ✗ Failed\n${SERVER_NAME}: node /abs/script.cjs - ✓ Connected\nthird: foo - ✓ Connected\n`,
        getOutput: buildGetOutput({ scope: 'user' }),
      });
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);
      expect(status.error).toBeUndefined();
    });

    it('префикс с пробелом: tracker не матчит tracker-dev', async () => {
      // Регрессия: префикс должен быть `<serverName>: ` (с пробелом).
      const c = new ClaudeCodeConnector('tracker');
      vi.mocked(CommandExecutor.execFile).mockReturnValue(
        'tracker-dev: node /x.cjs - ✓ Connected\n'
      );
      const status = await c.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBeUndefined();
    });

    it('scope парсится из строки `  Scope: User config ...`', async () => {
      mockExecFileSplit({
        listOutput: `${SERVER_NAME}: cmd - ✓ Connected\n`,
        getOutput: buildGetOutput({ scope: 'user' }),
      });
      const status = await connector.getStatus();
      expect(status.details?.scope).toBe('user');
    });

    it('scope парсится из строки `  Scope: Project config ...`', async () => {
      mockExecFileSplit({
        listOutput: `${SERVER_NAME}: cmd - ✓ Connected\n`,
        getOutput: buildGetOutput({ scope: 'project' }),
      });
      const status = await connector.getStatus();
      expect(status.details?.scope).toBe('project');
    });
  });

  describe('connect', () => {
    it('бросает ошибку, если запись уже зарегистрирована (любой scope)', async () => {
      mockExecFileSplit({ getOutput: buildGetOutput({ scope: 'local' }) });
      await expect(
        connector.connect({ command: 'node', args: ['/abs/script.cjs'], env: { TOKEN: 'x' } })
      ).rejects.toThrow(/уже зарегистрирован/);
      // add НЕ был вызван
      expect(CommandExecutor.execInteractive).not.toHaveBeenCalled();
    });

    it('сообщает в ошибке найденный scope и подсказывает remove', async () => {
      mockExecFileSplit({ getOutput: buildGetOutput({ scope: 'user' }) });
      await expect(
        connector.connect({ command: 'node', args: ['/abs/script.cjs'], env: {} })
      ).rejects.toThrow(/scope: user/);
    });

    it('формирует команду `claude mcp add --scope user` со всеми env и args, когда записи нет', async () => {
      mockExecFileSplit({ getOutput: null });
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
      // ключевое требование фикса: scope = user
      expect(args).toContain('--scope');
      expect(args[args.indexOf('--scope') + 1]).toBe('user');
      expect(args).toContain(SERVER_NAME);
      expect(args).toContain('--env');
      expect(args).toContain('TOKEN=sec');
      expect(args).toContain('ORG=org-1');
      expect(args).toContain('--');
      const sepIdx = args.indexOf('--');
      expect(args.slice(sepIdx + 1)).toEqual(['node', '/abs/script.cjs']);
    });

    it('connect с пустым env → без флагов --env (но --scope user остаётся)', async () => {
      mockExecFileSplit({ getOutput: null });
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue(undefined);
      await connector.connect({ command: 'node', args: ['/abs/script.cjs'], env: {} });
      const [, args] = vi.mocked(CommandExecutor.execInteractive).mock.calls[0]!;
      expect(args.includes('--env')).toBe(false);
      expect(args).toContain('--scope');
      expect(args[args.indexOf('--scope') + 1]).toBe('user');
    });
  });

  describe('disconnect', () => {
    it('удаляет из найденного scope через `claude mcp remove --scope <scope>`', async () => {
      // 1-я итерация: get → local; 2-я итерация: get → not found
      const calls: Array<string | null> = [buildGetOutput({ scope: 'local' }), null];
      vi.mocked(CommandExecutor.execFile).mockImplementation(() => {
        const next = calls.shift();
        if (next === null) throw new Error('not found');
        return next ?? '';
      });
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue(undefined);

      await connector.disconnect();

      expect(CommandExecutor.execInteractive).toHaveBeenCalledTimes(1);
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'remove',
        '--scope',
        'local',
        SERVER_NAME,
      ]);
    });

    it('итеративно удаляет дубликат из нескольких scope', async () => {
      // get показывает по одному scope за итерацию: сначала local, затем user, затем ничего
      const queue: Array<string | null> = [
        buildGetOutput({ scope: 'local' }),
        buildGetOutput({ scope: 'user' }),
        null,
      ];
      vi.mocked(CommandExecutor.execFile).mockImplementation(() => {
        const next = queue.shift();
        if (next === null) throw new Error('not found');
        return next ?? '';
      });
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue(undefined);

      await connector.disconnect();

      expect(CommandExecutor.execInteractive).toHaveBeenCalledTimes(2);
      const calls = vi.mocked(CommandExecutor.execInteractive).mock.calls;
      expect(calls[0]![1]).toEqual(['mcp', 'remove', '--scope', 'local', SERVER_NAME]);
      expect(calls[1]![1]).toEqual(['mcp', 'remove', '--scope', 'user', SERVER_NAME]);
    });

    it('бросает ошибку, если запись не найдена ни в одном scope', async () => {
      vi.mocked(CommandExecutor.execFile).mockImplementation(() => {
        throw new Error('not found');
      });
      await expect(connector.disconnect()).rejects.toThrow(/не зарегистрирован/);
      expect(CommandExecutor.execInteractive).not.toHaveBeenCalled();
    });

    it('поддерживает scope=project (через метку `Project config`)', async () => {
      const queue: Array<string | null> = [buildGetOutput({ scope: 'project' }), null];
      vi.mocked(CommandExecutor.execFile).mockImplementation(() => {
        const next = queue.shift();
        if (next === null) throw new Error('not found');
        return next ?? '';
      });
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue(undefined);

      await connector.disconnect();

      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'remove',
        '--scope',
        'project',
        SERVER_NAME,
      ]);
    });
  });

  describe('getLaunchSpec через `claude mcp get`', () => {
    it('парсит многострочный Environment (CLI 2.x: KEY=value на отдельных строках)', async () => {
      vi.mocked(CommandExecutor.execFile).mockReturnValue(
        buildGetOutput({ scope: 'local', envLines: ['TOKEN=sec', 'ORG=org-1'] })
      );
      const spec = await connector.getLaunchSpec();
      expect(spec).toEqual({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: { TOKEN: 'sec', ORG: 'org-1' },
      });
    });

    it('парсит legacy однострочный Environment (через запятую)', async () => {
      vi.mocked(CommandExecutor.execFile).mockReturnValue(
        [
          `${SERVER_NAME}:`,
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
      vi.mocked(CommandExecutor.execFile).mockReturnValue(
        [`server`, '  Type: http', '  Command: irrelevant'].join('\n')
      );
      const spec = await connector.getLaunchSpec();
      expect(spec).toBeNull();
    });

    it('возвращает null при отсутствии Command', async () => {
      vi.mocked(CommandExecutor.execFile).mockReturnValue('Type: stdio\nArgs: a');
      const spec = await connector.getLaunchSpec();
      expect(spec).toBeNull();
    });

    it('возвращает null если CommandExecutor бросает', async () => {
      vi.mocked(CommandExecutor.execFile).mockImplementation(() => {
        throw new Error('not found');
      });
      const spec = await connector.getLaunchSpec();
      expect(spec).toBeNull();
    });

    it('передаёт имя сервера как отдельный аргумент (без shell-escaping)', async () => {
      vi.mocked(CommandExecutor.execFile).mockReturnValue('Type: stdio\nCommand: node\nArgs:');
      const c = new ClaudeCodeConnector("name with 'quote");
      await c.getLaunchSpec();
      const [bin, args] = vi.mocked(CommandExecutor.execFile).mock.calls[0]!;
      expect(bin).toBe('claude');
      expect(args).toEqual(['mcp', 'get', "name with 'quote"]);
    });

    it('возвращает пустые args/env когда полей нет', async () => {
      vi.mocked(CommandExecutor.execFile).mockReturnValue('Command: /abs/server');
      const spec = await connector.getLaunchSpec();
      expect(spec).toEqual({ command: '/abs/server', args: [], env: {} });
    });

    it('multi-line Environment с пустой следующей строкой и trailing-секцией → env: {}', async () => {
      vi.mocked(CommandExecutor.execFile).mockReturnValue(
        [
          `${SERVER_NAME}:`,
          '  Type: stdio',
          '  Command: node',
          '  Args: /abs/script.cjs',
          '  Environment:',
          '',
          'To remove this server, run: claude mcp remove "x"',
        ].join('\n')
      );
      const spec = await connector.getLaunchSpec();
      expect(spec).toEqual({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: {},
      });
    });
  });
});
