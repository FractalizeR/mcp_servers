/**
 * Конфигурируемый file-based коннектор
 *
 * Заменяет дублирование в GeminiConnector, QwenConnector, CodexConnector
 * путём передачи конфигурации через конструктор вместо наследования.
 */

import { FileBasedConnector, type ConfigFormat } from './file-based-connector.js';
import type { BaseMCPServerConfig, MCPClientInfo } from '../../types.js';

/**
 * Конфигурация клиента для ConfigurableConnector
 */
export interface ConnectorClientConfig {
  /** Уникальное имя клиента (например, 'gemini', 'qwen', 'codex') */
  name: string;
  /** Отображаемое имя (например, 'Gemini CLI') */
  displayName: string;
  /** Описание клиента */
  description: string;
  /** Путь к конфигурационному файлу */
  configPath: string;
  /** Поддерживаемые платформы */
  platforms: Array<'darwin' | 'linux' | 'win32'>;
  /** Команда проверки установки (опционально) */
  checkCommand?: string;
  /** Ключ для серверов в конфиге (по умолчанию 'mcpServers') */
  serverKey?: string;
  /** Формат конфига (по умолчанию 'json') */
  configFormat?: ConfigFormat;
}

/**
 * Конфигурируемый file-based коннектор
 *
 * Позволяет создавать коннекторы без наследования, передавая конфигурацию
 * в конструктор. Устраняет дублирование кода между похожими коннекторами.
 *
 * @example
 * ```typescript
 * const geminiConnector = new ConfigurableConnector(
 *   'mcp-server-yandex-tracker',
 *   'dist/yandex-tracker.bundle.cjs',
 *   {
 *     name: 'gemini',
 *     displayName: 'Gemini CLI',
 *     description: 'Gemini CLI для разработки с MCP серверами',
 *     configPath: path.join(os.homedir(), '.gemini/settings.json'),
 *     platforms: ['darwin', 'linux', 'win32'],
 *   }
 * );
 * ```
 */
export class ConfigurableConnector<
  TConfig extends BaseMCPServerConfig = BaseMCPServerConfig,
> extends FileBasedConnector<TConfig, string, ConfigFormat> {
  private readonly _serverName: string;
  private readonly _entryPoint: string;
  private readonly _clientConfig: ConnectorClientConfig;

  /**
   * @param serverName - Имя MCP сервера для записи в конфигурацию
   * @param entryPoint - Относительный путь к точке входа сервера от projectPath
   * @param clientConfig - Конфигурация клиента
   */
  constructor(serverName: string, entryPoint: string, clientConfig: ConnectorClientConfig) {
    super();
    this._serverName = serverName;
    this._entryPoint = entryPoint;
    this._clientConfig = clientConfig;
  }

  getClientInfo(): MCPClientInfo {
    const info: MCPClientInfo = {
      name: this._clientConfig.name,
      displayName: this._clientConfig.displayName,
      description: this._clientConfig.description,
      configPath: this._clientConfig.configPath,
      platforms: this._clientConfig.platforms,
    };
    if (this._clientConfig.checkCommand) {
      info.checkCommand = this._clientConfig.checkCommand;
    }
    return info;
  }

  protected getConfigPath(): string {
    return this._clientConfig.configPath;
  }

  protected getServerName(): string {
    return this._serverName;
  }

  protected getEntryPoint(): string {
    return this._entryPoint;
  }

  protected override getServerKey(): string {
    return this._clientConfig.serverKey ?? 'mcpServers';
  }

  protected override getConfigFormat(): ConfigFormat {
    return this._clientConfig.configFormat ?? 'json';
  }
}
