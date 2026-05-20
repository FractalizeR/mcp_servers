/**
 * Integration: полный workflow connect → status → disconnect на реальных файлах.
 *
 * Покрытие:
 *  - JSON-сценарий (Gemini): запись + чтение + удаление в `~/.gemini/settings.json`
 *  - TOML-сценарий (Codex): отдельная проверка `serverKey: 'mcp_servers'` и формата
 *  - ConfigManager: реальный roundtrip save → load
 *
 * Все пути перенаправляются в tmpdir через подмену HOME.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as toml from '@iarna/toml';
import {
  ConfigurableConnector,
  type ConnectorClientConfig,
} from '../../src/connectors/base/configurable-connector.js';
import { ConfigManager } from '../../src/utils/config-manager.js';

const SERVER = 'mcp-server-yandex-tracker';

describe('Integration: full workflow (real tmp files)', () => {
  let tmpHome: string;
  let oldHome: string | undefined;
  let oldUserProfile: string | undefined;
  let serverScriptPath: string;

  beforeEach(async () => {
    tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-int-'));
    oldHome = process.env['HOME'];
    oldUserProfile = process.env['USERPROFILE'];
    process.env['HOME'] = tmpHome;
    process.env['USERPROFILE'] = tmpHome;

    // Создаём «бандл» сервера, чтобы getStatus возвращал connected:true
    serverScriptPath = path.join(tmpHome, 'fake-bundle.cjs');
    await fs.writeFile(serverScriptPath, 'console.log("ok");', 'utf-8');
  });

  afterEach(async () => {
    if (oldHome === undefined) delete process.env['HOME'];
    else process.env['HOME'] = oldHome;
    if (oldUserProfile === undefined) delete process.env['USERPROFILE'];
    else process.env['USERPROFILE'] = oldUserProfile;
    await fs.rm(tmpHome, { recursive: true, force: true });
  });

  describe('JSON workflow (Gemini-like)', () => {
    const config = (): ConnectorClientConfig => ({
      name: 'gemini',
      displayName: 'Gemini',
      description: 'Gemini',
      configPath: path.join(tmpHome, '.gemini/settings.json'),
      platforms: ['darwin', 'linux', 'win32'],
    });

    it('connect → файл создаётся с правильной структурой mcpServers', async () => {
      const c = new ConfigurableConnector(SERVER, config());

      await c.connect({
        command: 'node',
        args: [serverScriptPath],
        env: { TOKEN: 'sec', ORG: 'org-1' },
      });

      const cfgPath = path.join(tmpHome, '.gemini/settings.json');
      const raw = JSON.parse(await fs.readFile(cfgPath, 'utf-8')) as Record<string, unknown>;
      expect(raw['mcpServers']).toBeTruthy();
      const servers = raw['mcpServers'] as Record<string, Record<string, unknown>>;
      expect(servers[SERVER]).toEqual({
        command: 'node',
        args: [serverScriptPath],
        env: { TOKEN: 'sec', ORG: 'org-1' },
      });
    });

    it('getStatus возвращает connected: true когда команда есть на диске', async () => {
      const c = new ConfigurableConnector(SERVER, config());
      await c.connect({
        command: 'node',
        args: [serverScriptPath],
        env: {},
      });

      const status = await c.getStatus();
      expect(status.connected).toBe(true);
      expect(status.error).toBeUndefined();
    });

    it('getStatus возвращает connected: false если скрипт удалён', async () => {
      const c = new ConfigurableConnector(SERVER, config());
      await c.connect({ command: 'node', args: [serverScriptPath], env: {} });
      await fs.unlink(serverScriptPath);

      const status = await c.getStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toContain('не найдена на диске');
    });

    it('connect мержит с существующим конфигом, не теряя другие сервера', async () => {
      const cfgPath = path.join(tmpHome, '.gemini/settings.json');
      await fs.mkdir(path.dirname(cfgPath), { recursive: true });
      await fs.writeFile(
        cfgPath,
        JSON.stringify({
          mcpServers: { 'other-server': { command: 'other', args: [], env: {} } },
          someOtherSection: { foo: 'bar' },
        }),
        'utf-8'
      );

      const c = new ConfigurableConnector(SERVER, config());
      await c.connect({ command: 'node', args: [serverScriptPath], env: {} });

      const raw = JSON.parse(await fs.readFile(cfgPath, 'utf-8')) as Record<string, unknown>;
      const servers = raw['mcpServers'] as Record<string, unknown>;
      expect(servers).toHaveProperty('other-server');
      expect(servers).toHaveProperty(SERVER);
      expect(raw['someOtherSection']).toEqual({ foo: 'bar' });
    });

    it('disconnect удаляет только нашу запись', async () => {
      const cfgPath = path.join(tmpHome, '.gemini/settings.json');
      const c = new ConfigurableConnector(SERVER, config());

      await c.connect({ command: 'node', args: [serverScriptPath], env: {} });
      // Добавим вручную ещё одну запись
      const raw = JSON.parse(await fs.readFile(cfgPath, 'utf-8')) as Record<
        string,
        Record<string, unknown>
      >;
      raw['mcpServers']!['other-server'] = { command: 'x', args: [], env: {} };
      await fs.writeFile(cfgPath, JSON.stringify(raw), 'utf-8');

      await c.disconnect();

      const after = JSON.parse(await fs.readFile(cfgPath, 'utf-8')) as Record<
        string,
        Record<string, unknown>
      >;
      expect(after['mcpServers']).toHaveProperty('other-server');
      expect(after['mcpServers']).not.toHaveProperty(SERVER);
    });

    it('getLaunchSpec возвращает то, что было записано connect', async () => {
      const c = new ConfigurableConnector(SERVER, config());
      const spec = {
        command: 'node',
        args: [serverScriptPath],
        env: { TOKEN: 'sec' },
      };
      await c.connect(spec);
      expect(await c.getLaunchSpec()).toEqual(spec);
    });
  });

  describe('TOML workflow (Codex-like) — отдельный сценарий', () => {
    const config = (): ConnectorClientConfig => ({
      name: 'codex',
      displayName: 'Codex',
      description: 'Codex',
      configPath: path.join(tmpHome, '.codex/config.toml'),
      platforms: ['darwin', 'linux', 'win32'],
      serverKey: 'mcp_servers',
      configFormat: 'toml',
    });

    it('connect → TOML файл с serverKey "mcp_servers"', async () => {
      const c = new ConfigurableConnector(SERVER, config());
      await c.connect({
        command: 'node',
        args: [serverScriptPath],
        env: { TOKEN: 'sec' },
      });

      const cfgPath = path.join(tmpHome, '.codex/config.toml');
      const content = await fs.readFile(cfgPath, 'utf-8');
      const parsed = toml.parse(content) as Record<string, unknown>;

      // Проверяем именно serverKey: 'mcp_servers' (не camelCase)
      expect(parsed).toHaveProperty('mcp_servers');
      expect(parsed).not.toHaveProperty('mcpServers');

      const servers = parsed['mcp_servers'] as Record<string, Record<string, unknown>>;
      expect(servers[SERVER]).toEqual({
        command: 'node',
        args: [serverScriptPath],
        env: { TOKEN: 'sec' },
      });
    });

    it('TOML roundtrip: connect → getLaunchSpec возвращает корректный spec', async () => {
      const c = new ConfigurableConnector(SERVER, config());
      const spec = {
        command: 'node',
        args: [serverScriptPath],
        env: { TOKEN: 'sec', ORG: 'org-1' },
      };
      await c.connect(spec);

      const restored = await c.getLaunchSpec();
      expect(restored).toEqual(spec);
    });

    it('TOML disconnect удаляет запись, файл остаётся валидным TOML', async () => {
      const c = new ConfigurableConnector(SERVER, config());
      await c.connect({ command: 'node', args: [serverScriptPath], env: {} });
      await c.disconnect();

      const cfgPath = path.join(tmpHome, '.codex/config.toml');
      const content = await fs.readFile(cfgPath, 'utf-8');
      // Парсится без ошибок
      const parsed = toml.parse(content) as Record<string, unknown>;
      expect(parsed['mcp_servers']).toEqual({});
    });

    it('TOML getStatus: подключён + команда на диске → connected: true', async () => {
      const c = new ConfigurableConnector(SERVER, config());
      await c.connect({ command: 'node', args: [serverScriptPath], env: {} });
      const status = await c.getStatus();
      expect(status.connected).toBe(true);
    });
  });

  describe('ConfigManager roundtrip', () => {
    interface YtConfig {
      token: string;
      orgId: string;
    }

    it('save → load возвращает то же значение', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName: 'fractalizer_test_int' });
      await cm.save({ token: 'sec', orgId: 'org-1' });
      expect(await cm.load()).toEqual({ token: 'sec', orgId: 'org-1' });
    });

    it('save с serialize-хуком: load возвращает только разрешённые поля', async () => {
      const cm = new ConfigManager<YtConfig>({
        projectName: 'fractalizer_test_int_serialize',
        serialize: (cfg) => ({ orgId: cfg.orgId }),
      });
      await cm.save({ token: 'TOP_SECRET', orgId: 'org-1' });
      const loaded = await cm.load();
      expect(loaded).toEqual({ orgId: 'org-1' });
      expect(loaded).not.toHaveProperty('token');
    });

    it('права на файл = 0o600', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName: 'fractalizer_test_int_perm' });
      await cm.save({ token: 's', orgId: 'o' });
      const stat = await fs.stat(cm.getConfigPath());
      expect(stat.mode & 0o777).toBe(0o600);
    });
  });
});
