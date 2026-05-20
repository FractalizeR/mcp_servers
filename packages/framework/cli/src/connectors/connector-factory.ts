/**
 * Фабрика коннекторов для известных MCP клиентов.
 *
 * Централизует конфигурацию клиентов и устраняет дублирование кода.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import {
  ConfigurableConnector,
  type ConnectorClientConfig,
} from './base/configurable-connector.js';

/**
 * Известные MCP клиенты (файл-ориентированные).
 *
 * `claude-code` — отдельный {@link ClaudeCodeConnector}, потому что управляется
 * не файлом, а командами `claude mcp add/remove/list`.
 */
export type KnownClient = 'claude-desktop' | 'gemini' | 'qwen' | 'codex';

/**
 * Platform-aware путь к конфигу Claude Desktop.
 *
 * Вычисляется лениво (через функцию), чтобы избежать обращений к `os.platform()`
 * при импорте модуля и упростить тестирование.
 */
function claudeDesktopConfigPath(): string {
  const platform = os.platform();
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');
  }
  if (platform === 'linux') {
    return path.join(os.homedir(), '.config/claude/claude_desktop_config.json');
  }
  // win32 и прочие
  return path.join(process.env['APPDATA'] ?? '', 'Claude/claude_desktop_config.json');
}

/**
 * Конфигурации известных клиентов
 */
const CLIENT_CONFIGS: Record<KnownClient, ConnectorClientConfig> = {
  'claude-desktop': {
    name: 'claude-desktop',
    displayName: 'Claude Desktop',
    description: 'Официальное десктопное приложение Claude от Anthropic',
    configPath: claudeDesktopConfigPath,
    platforms: ['darwin', 'linux', 'win32'],
    serverKey: 'mcpServers',
    configFormat: 'json',
  },
  gemini: {
    name: 'gemini',
    displayName: 'Gemini CLI',
    description: 'Gemini CLI для разработки с MCP серверами',
    configPath: path.join(os.homedir(), '.gemini/settings.json'),
    platforms: ['darwin', 'linux', 'win32'],
    serverKey: 'mcpServers',
    configFormat: 'json',
  },
  qwen: {
    name: 'qwen',
    displayName: 'Qwen Code',
    description: 'Qwen Code для разработки с MCP серверами',
    configPath: path.join(os.homedir(), '.qwen/settings.json'),
    platforms: ['darwin', 'linux', 'win32'],
    serverKey: 'mcpServers',
    configFormat: 'json',
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    description: 'CLI инструмент Codex от OpenAI',
    configPath: path.join(os.homedir(), '.codex/config.toml'),
    platforms: ['darwin', 'linux', 'win32'],
    checkCommand: 'codex --version',
    serverKey: 'mcp_servers',
    configFormat: 'toml',
  },
};

/**
 * Создать коннектор для известного клиента.
 *
 * @param client - Имя известного клиента
 * @param serverName - Имя MCP сервера для записи в конфиг
 *
 * @example
 * ```typescript
 * const gemini = createConnector('gemini', 'mcp-server-yandex-tracker');
 * const desktop = createConnector('claude-desktop', 'mcp-server-yandex-tracker');
 * ```
 */
export function createConnector(client: KnownClient, serverName: string): ConfigurableConnector {
  return new ConfigurableConnector(serverName, CLIENT_CONFIGS[client]);
}

/**
 * Создать коннектор с произвольной конфигурацией клиента.
 *
 * @param serverName - Имя MCP сервера
 * @param clientConfig - Конфигурация клиента
 */
export function createCustomConnector(
  serverName: string,
  clientConfig: ConnectorClientConfig
): ConfigurableConnector {
  return new ConfigurableConnector(serverName, clientConfig);
}

/**
 * Получить конфигурацию известного клиента (копию).
 */
export function getClientConfig(client: KnownClient): ConnectorClientConfig {
  return { ...CLIENT_CONFIGS[client] };
}

/**
 * Получить список всех известных клиентов.
 */
export function getKnownClients(): KnownClient[] {
  return Object.keys(CLIENT_CONFIGS) as KnownClient[];
}
