/**
 * Core types for MCP CLI Framework
 * @packageDocumentation
 */

// Re-export all base types
export {
  type BaseMCPServerConfig,
  type MCPClientInfo,
  type ConnectionStatus,
  type MCPClientServerConfig,
  type MCPClientConfig,
  type PromptType,
  type ConfigPromptDefinition,
  type ConfigManagerOptions,
} from './types/base.types.js';

// Import for use in this file's type definitions
import type {
  BaseMCPServerConfig,
  ConnectionStatus,
  ConfigPromptDefinition,
} from './types/base.types.js';
import type { MCPConnector } from './connectors/base/connector.interface.js';
import type { ConfigManager } from './utils/config-manager.js';

/**
 * Опции для команды connect
 */
export interface ConnectCommandOptions<TConfig extends BaseMCPServerConfig> {
  /** Реестр коннекторов */
  registry: IConnectorRegistry<TConfig>;

  /** Менеджер конфигурации */
  configManager: ConfigManager<TConfig>;

  /** Промпты для сбора конфигурации */
  configPrompts: ConfigPromptDefinition<TConfig>[];

  /** CLI опции (из commander) */
  cliOptions?: {
    client?: string;
  };

  /** Опционально: функция для добавления projectPath к конфигу */
  buildConfig?: (serverConfig: Omit<TConfig, 'projectPath'>) => TConfig;
}

/**
 * Интерфейс для реестра MCP коннекторов
 * @internal - используется только для типизации command options
 */
export interface IConnectorRegistry<TConfig extends BaseMCPServerConfig = BaseMCPServerConfig> {
  register(connector: MCPConnector<TConfig>): void;
  get(name: string): MCPConnector<TConfig> | undefined;
  getAll(): MCPConnector<TConfig>[];
  findInstalled(): Promise<MCPConnector<TConfig>[]>;
  checkAllStatuses(): Promise<Map<string, ConnectionStatus>>;
}

// Re-export MCPConnector for convenience
export type { MCPConnector };
