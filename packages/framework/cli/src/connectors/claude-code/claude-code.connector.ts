/**
 * Коннектор для Claude Code
 */

import * as path from 'node:path';
import { BaseConnector } from '../base/base-connector.js';
import type { BaseMCPServerConfig, MCPClientInfo, ConnectionStatus } from '../../types.js';
import { CommandExecutor } from '../../utils/command-executor.js';

/**
 * Type guard для проверки Error
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Коннектор для Claude Code CLI
 * Использует команды `claude mcp add/remove/list` для управления серверами
 *
 * @template TConfig - Тип конфигурации MCP сервера
 */
export class ClaudeCodeConnector<
  TConfig extends BaseMCPServerConfig = BaseMCPServerConfig,
> extends BaseConnector<TConfig> {
  private readonly serverName: string;
  private readonly entryPoint: string;

  /**
   * @param serverName - Имя MCP сервера для записи в конфигурацию
   * @param entryPoint - Относительный путь к точке входа сервера от projectPath
   */
  constructor(serverName: string, entryPoint: string) {
    super();
    this.serverName = serverName;
    this.entryPoint = entryPoint;
  }

  /**
   * Получить информацию о клиенте
   */
  getClientInfo(): MCPClientInfo {
    return {
      name: 'claude-code',
      displayName: 'Claude Code',
      description: 'CLI инструмент Claude Code для разработки',
      checkCommand: 'claude --version',
      configPath: 'managed-by-cli',
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  /**
   * Проверить, установлен ли клиент
   */
  isInstalled(): Promise<boolean> {
    return Promise.resolve(CommandExecutor.isCommandAvailable('claude'));
  }

  /**
   * Получить статус подключения
   */
  getStatus(): Promise<ConnectionStatus> {
    try {
      const output = CommandExecutor.exec('claude mcp list');
      const connected = output.includes(this.serverName);

      if (connected) {
        return Promise.resolve({
          connected,
          details: {
            configPath: 'managed by claude mcp',
          },
        });
      }

      return Promise.resolve({ connected });
    } catch (error) {
      return Promise.resolve({
        connected: false,
        error: `Ошибка проверки статуса: ${isError(error) ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Подключить MCP сервер
   */
  async connect(serverConfig: TConfig): Promise<void> {
    const args = ['mcp', 'add', '--transport', 'stdio', this.serverName];

    // Добавить переменные окружения из config.env
    if (serverConfig.env) {
      for (const [key, value] of Object.entries(serverConfig.env)) {
        args.push('--env', `${key}=${value}`);
      }
    }

    // Добавить команду и аргументы
    args.push('--', 'node', path.join(serverConfig.projectPath, this.entryPoint));

    await CommandExecutor.execInteractive('claude', args);
  }

  /**
   * Отключить MCP сервер
   */
  async disconnect(): Promise<void> {
    await CommandExecutor.execInteractive('claude', ['mcp', 'remove', this.serverName]);
  }
}
