/**
 * Тесты для connector-factory.
 *
 * Проверяем:
 *  - createConnector('claude-desktop' | 'gemini' | 'qwen' | 'codex') — корректные
 *    параметры (имя, формат конфига, serverKey, пути).
 *  - claude-desktop: platform-aware configPath (darwin / linux / win32).
 *  - createCustomConnector, getClientConfig, getKnownClients.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createConnector,
  createCustomConnector,
  getClientConfig,
  getKnownClients,
} from '../../../src/connectors/connector-factory.js';
import { ConfigurableConnector } from '../../../src/connectors/base/configurable-connector.js';
import * as os from 'node:os';

// В ESM нельзя сделать spyOn на экспорты node:os (свойство неконфигурируемое).
// Используем vi.mock с factory, и переключаем возврат через mockImplementation.
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    platform: vi.fn(() => actual.platform()),
    homedir: vi.fn(() => actual.homedir()),
  };
});

const SERVER = 'mcp-server-yandex-tracker';

describe('connector-factory', () => {
  afterEach(() => {
    // Сбросим возвращаемые значения, но оставим сами mock-функции.
    const actualOs = vi.importActual<typeof import('node:os')>('node:os');
    void actualOs.then((a) => {
      vi.mocked(os.platform).mockImplementation(() => a.platform());
      vi.mocked(os.homedir).mockImplementation(() => a.homedir());
    });
  });

  describe('createConnector returns ConfigurableConnector', () => {
    it.each(['claude-desktop', 'gemini', 'qwen', 'codex'] as const)(
      '%s → ConfigurableConnector с корректным name',
      (client) => {
        const c = createConnector(client, SERVER);
        expect(c).toBeInstanceOf(ConfigurableConnector);
        expect(c.getClientInfo().name).toBe(client);
      }
    );
  });

  describe('Gemini', () => {
    it('configPath = ~/.gemini/settings.json, JSON, serverKey mcpServers', () => {
      const c = createConnector('gemini', SERVER);
      const info = c.getClientInfo();
      expect(info.configPath).toMatch(/\.gemini\/settings\.json$/);
      const cfg = getClientConfig('gemini');
      expect(cfg.configFormat).toBe('json');
      expect(cfg.serverKey).toBe('mcpServers');
    });
  });

  describe('Qwen', () => {
    it('configPath = ~/.qwen/settings.json, JSON, serverKey mcpServers', () => {
      const c = createConnector('qwen', SERVER);
      expect(c.getClientInfo().configPath).toMatch(/\.qwen\/settings\.json$/);
      const cfg = getClientConfig('qwen');
      expect(cfg.configFormat).toBe('json');
      expect(cfg.serverKey).toBe('mcpServers');
    });
  });

  describe('Codex', () => {
    it('configPath = ~/.codex/config.toml, TOML, serverKey mcp_servers', () => {
      const c = createConnector('codex', SERVER);
      expect(c.getClientInfo().configPath).toMatch(/\.codex\/config\.toml$/);
      const cfg = getClientConfig('codex');
      expect(cfg.configFormat).toBe('toml');
      expect(cfg.serverKey).toBe('mcp_servers');
      expect(cfg.checkCommand).toBe('codex --version');
    });
  });

  describe('Claude Desktop: platform-aware configPath', () => {
    it('darwin → Library/Application Support/Claude', () => {
      vi.mocked(os.platform).mockReturnValue('darwin');
      const c = createConnector('claude-desktop', SERVER);
      expect(c.getClientInfo().configPath).toMatch(
        /Library\/Application Support\/Claude\/claude_desktop_config\.json$/
      );
    });

    it('linux → .config/claude/', () => {
      vi.mocked(os.platform).mockReturnValue('linux');
      const c = createConnector('claude-desktop', SERVER);
      expect(c.getClientInfo().configPath).toMatch(
        /\.config\/claude\/claude_desktop_config\.json$/
      );
    });

    it('win32 → APPDATA/Claude', () => {
      vi.mocked(os.platform).mockReturnValue('win32');
      const oldAppData = process.env['APPDATA'];
      process.env['APPDATA'] = '/AppData';
      try {
        const c = createConnector('claude-desktop', SERVER);
        expect(c.getClientInfo().configPath).toMatch(/Claude\/claude_desktop_config\.json$/);
        expect(c.getClientInfo().configPath).toContain('AppData');
      } finally {
        if (oldAppData === undefined) {
          delete process.env['APPDATA'];
        } else {
          process.env['APPDATA'] = oldAppData;
        }
      }
    });

    it('configPath вычисляется лениво (функция) — мок os.platform после создания тоже работает', () => {
      vi.mocked(os.platform).mockReturnValue('darwin');
      const c = createConnector('claude-desktop', SERVER);
      expect(c.getClientInfo().configPath).toContain('Library');

      vi.mocked(os.platform).mockReturnValue('linux');
      expect(c.getClientInfo().configPath).toContain('.config/claude');
    });
  });

  describe('createCustomConnector', () => {
    it('создаёт ConfigurableConnector с произвольной конфигурацией', () => {
      const c = createCustomConnector(SERVER, {
        name: 'custom',
        displayName: 'Custom',
        description: 'Custom client',
        configPath: '/tmp/x.json',
        platforms: ['darwin'],
      });
      expect(c).toBeInstanceOf(ConfigurableConnector);
      expect(c.getClientInfo().name).toBe('custom');
      expect(c.getClientInfo().configPath).toBe('/tmp/x.json');
    });
  });

  describe('getKnownClients', () => {
    it('возвращает все 4 имени', () => {
      const names = getKnownClients();
      expect(names).toEqual(expect.arrayContaining(['claude-desktop', 'gemini', 'qwen', 'codex']));
      expect(names).toHaveLength(4);
    });
  });

  describe('getClientConfig возвращает копию', () => {
    it('изменения в копии не затрагивают исходный конфиг', () => {
      const copy1 = getClientConfig('gemini');
      copy1.name = 'mutated';
      const copy2 = getClientConfig('gemini');
      expect(copy2.name).toBe('gemini');
    });
  });
});
