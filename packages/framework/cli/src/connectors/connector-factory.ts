/**
 * Фабрика коннекторов для известных MCP клиентов
 *
 * Централизует конфигурацию клиентов и устраняет дублирование кода.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import {
  ConfigurableConnector,
  type ConnectorClientConfig,
} from './base/configurable-connector.js';
import type { BaseMCPServerConfig } from '../types.js';

/**
 * Известные MCP клиенты
 */
export type KnownClient = 'gemini' | 'qwen' | 'codex';

/**
 * Конфигурации известных клиентов
 */
const CLIENT_CONFIGS: Record<KnownClient, ConnectorClientConfig> = {
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
 * Создать коннектор для известного клиента
 *
 * @param client - Имя известного клиента
 * @param serverName - Имя MCP сервера
 * @param entryPoint - Относительный путь к точке входа сервера
 *
 * @example
 * ```typescript
 * const geminiConnector = createConnector('gemini', 'mcp-server-yandex-tracker', 'dist/yandex-tracker.bundle.cjs');
 * const qwenConnector = createConnector('qwen', 'mcp-server-yandex-tracker', 'dist/yandex-tracker.bundle.cjs');
 * ```
 */
export function createConnector<TConfig extends BaseMCPServerConfig = BaseMCPServerConfig>(
  client: KnownClient,
  serverName: string,
  entryPoint: string
): ConfigurableConnector<TConfig> {
  const config = CLIENT_CONFIGS[client];
  return new ConfigurableConnector<TConfig>(serverName, entryPoint, config);
}

/**
 * Создать коннектор с кастомной конфигурацией
 *
 * @param serverName - Имя MCP сервера
 * @param entryPoint - Относительный путь к точке входа сервера
 * @param clientConfig - Конфигурация клиента
 */
export function createCustomConnector<TConfig extends BaseMCPServerConfig = BaseMCPServerConfig>(
  serverName: string,
  entryPoint: string,
  clientConfig: ConnectorClientConfig
): ConfigurableConnector<TConfig> {
  return new ConfigurableConnector<TConfig>(serverName, entryPoint, clientConfig);
}

/**
 * Получить конфигурацию известного клиента
 */
export function getClientConfig(client: KnownClient): ConnectorClientConfig {
  return { ...CLIENT_CONFIGS[client] };
}

/**
 * Получить список всех известных клиентов
 */
export function getKnownClients(): KnownClient[] {
  return Object.keys(CLIENT_CONFIGS) as KnownClient[];
}
