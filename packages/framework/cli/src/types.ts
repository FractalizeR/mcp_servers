/**
 * Core types for MCP CLI Framework
 * @packageDocumentation
 */

// Re-export all client-related types
export {
  type MCPClientInfo,
  type ConnectionStatus,
  type MCPClientServerConfig,
  type MCPClientConfig,
  type PromptType,
  type ConfigPromptDefinition,
  type ConfigManagerOptions,
} from './types/client.types.js';

// Re-export launch spec
export { type ServerLaunchSpec } from './types/launch.types.js';

// Import for use in this file's type definitions
import type { ConnectionStatus, ConfigPromptDefinition } from './types/client.types.js';
import type { ServerLaunchSpec } from './types/launch.types.js';
import type { MCPConnector } from './connectors/base/connector.interface.js';
import type { ConfigManager } from './utils/config-manager.js';

/**
 * Опции для команды connect
 *
 * @template TDomainConfig - Тип доменной конфигурации MCP сервера (произвольный объект)
 */
export interface ConnectCommandOptions<TDomainConfig extends object> {
  /** Реестр коннекторов */
  registry: IConnectorRegistry;

  /** Менеджер конфигурации */
  configManager: ConfigManager<TDomainConfig>;

  /** Промпты для сбора доменной конфигурации */
  configPrompts: ConfigPromptDefinition<TDomainConfig>[];

  /**
   * Адаптер: доменная конфигурация → спецификация запуска MCP сервера.
   * Framework не знает структуру `TDomainConfig`, эта функция превращает её в
   * `{ command, args, env }` для записи в конфиг клиента.
   */
  buildServerLaunch: (config: TDomainConfig) => ServerLaunchSpec;

  /** CLI опции (из commander) */
  cliOptions?: {
    client?: string;
  };
}

/**
 * Интерфейс для реестра MCP коннекторов
 * @internal - используется только для типизации command options
 */
export interface IConnectorRegistry {
  register(connector: MCPConnector): void;
  get(name: string): MCPConnector | undefined;
  getAll(): MCPConnector[];
  findInstalled(): Promise<MCPConnector[]>;
  checkAllStatuses(): Promise<Map<string, ConnectionStatus>>;
}

// Re-export MCPConnector for convenience
export type { MCPConnector };
