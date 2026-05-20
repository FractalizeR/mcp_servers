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
 *
 * Win32: предпочтительно используем `%APPDATA%`. Если переменная не задана
 * (нестандартное окружение, CI без полного user profile, WSL fallback) —
 * используем `~/AppData/Roaming/Claude/...`, что является каноническим путём
 * для современных Windows-систем.
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
  const appData = process.env['APPDATA'] ?? path.join(os.homedir(), 'AppData/Roaming');
  return path.join(appData, 'Claude/claude_desktop_config.json');
}

/**
 * Lazy paths для остальных клиентов — единообразие с claudeDesktopConfigPath
 * и устойчивость к подмене `HOME`/`USERPROFILE` в runtime (важно для тестов
 * и кастомных окружений).
 */
function geminiConfigPath(): string {
  return path.join(os.homedir(), '.gemini/settings.json');
}

function qwenConfigPath(): string {
  return path.join(os.homedir(), '.qwen/settings.json');
}

function codexConfigPath(): string {
  return path.join(os.homedir(), '.codex/config.toml');
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
    configPath: geminiConfigPath,
    platforms: ['darwin', 'linux', 'win32'],
    serverKey: 'mcpServers',
    configFormat: 'json',
  },
  qwen: {
    name: 'qwen',
    displayName: 'Qwen Code',
    description: 'Qwen Code для разработки с MCP серверами',
    configPath: qwenConfigPath,
    platforms: ['darwin', 'linux', 'win32'],
    serverKey: 'mcpServers',
    configFormat: 'json',
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    description: 'CLI инструмент Codex от OpenAI',
    configPath: codexConfigPath,
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
