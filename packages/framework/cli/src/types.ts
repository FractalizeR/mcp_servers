/**
 * Core types for MCP CLI Framework
 * @packageDocumentation
 */

// Import MCPConnector for use in forward declarations
import type { MCPConnector } from './connectors/base/connector.interface.js';
// Forward reference to ConfigManager (implemented in utils/config-manager.ts)

import type { ConfigManager } from './utils/config-manager.js';

/**
 * Базовая конфигурация для любого MCP сервера
 * Все MCP серверы должны расширять этот интерфейс
 */
export interface BaseMCPServerConfig {
  /** Абсолютный путь к директории проекта */
  projectPath: string;

  /** Уровень логирования */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /** Дополнительные переменные окружения для MCP сервера */
  env?: Record<string, string>;
}

/**
 * Информация о MCP клиенте (Claude Desktop, Claude Code и т.д.)
 */
export interface MCPClientInfo {
  /** Уникальное имя клиента (используется как ключ) */
  name: string;

  /** Отображаемое имя для пользователя */
  displayName: string;

  /** Описание клиента */
  description: string;

  /** Команда для проверки установки (например, 'claude --version') */
  checkCommand?: string;

  /** Путь к конфигурационному файлу */
  configPath: string;

  /** Поддерживаемые платформы */
  platforms: Array<'darwin' | 'linux' | 'win32'>;
}

/**
 * Статус подключения MCP сервера к клиенту
 */
export interface ConnectionStatus {
  /** Подключен ли сервер */
  connected: boolean;

  /** Детали подключения */
  details?: {
    /** Путь к конфигурационному файлу клиента */
    configPath: string;

    /** Время последнего изменения конфига */
    lastModified?: Date;

    /** Дополнительная информация */
    metadata?: Record<string, unknown>;
  };

  /** Ошибка (если есть) */
  error?: string;
}

/**
 * Конфигурация MCP сервера для записи в файл клиента (JSON/TOML)
 */
export interface MCPClientServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/**
 * Базовая структура конфигурационного файла MCP клиента
 * Generic тип для разных форматов (mcpServers, mcp_servers и т.д.)
 */
export type MCPClientConfig<TKey extends string = 'mcpServers'> = {
  [K in TKey]?: Record<string, MCPClientServerConfig>;
};

/**
 * Типы промптов для сбора конфигурации
 */
export type PromptType = 'input' | 'password' | 'list' | 'confirm' | 'number';

/**
 * Определение промпта для сбора конфигурации
 * Generic по типу конфигурации и ключу поля
 */
export interface ConfigPromptDefinition<
  TConfig extends BaseMCPServerConfig,
  K extends keyof TConfig = keyof TConfig,
> {
  /** Имя поля в конфигурации */
  name: K;

  /** Тип промпта */
  type: PromptType;

  /** Сообщение для пользователя */
  message: string;

  /** Значение по умолчанию (может быть функцией от сохраненной конфигурации) */
  default?: TConfig[K] | ((savedConfig?: Partial<TConfig>) => TConfig[K] | undefined);

  /** Функция валидации */
  validate?: (value: TConfig[K]) => string | true;

  /** Варианты выбора (для type: 'list') */
  choices?: Array<{ name: string; value: TConfig[K] }>;

  /** Условное отображение промпта */
  when?: (answers: Partial<TConfig>) => boolean;

  /** Маска для ввода (для type: 'password') */
  mask?: string;
}

/**
 * Опции для ConfigManager
 */
export interface ConfigManagerOptions<TConfig extends BaseMCPServerConfig> {
  /** Название проекта (для ~/.{projectName}/config.json) */
  projectName: string;

  /**
   * Поля конфигурации, которые можно сохранять (без секретов!)
   * Например: ['orgId', 'logLevel', 'apiBase']
   */
  safeFields: Array<keyof TConfig>;

  /**
   * Опционально: кастомная сериализация перед записью в файл
   */
  serialize?: (config: TConfig) => Record<string, unknown>;

  /**
   * Опционально: кастомная десериализация после чтения из файла
   */
  deserialize?: (data: Record<string, unknown>) => Partial<TConfig>;
}

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
 * Опции для команды disconnect
 */
export interface DisconnectCommandOptions<TConfig extends BaseMCPServerConfig> {
  registry: IConnectorRegistry<TConfig>;
  cliOptions?: {
    client?: string;
    all?: boolean;
  };
}

/**
 * Опции для команды validate
 */
export interface ValidateCommandOptions<TConfig extends BaseMCPServerConfig> {
  registry: IConnectorRegistry<TConfig>;
  configManager: ConfigManager<TConfig>;
  cliOptions?: {
    client?: string;
  };
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
