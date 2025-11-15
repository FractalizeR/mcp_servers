/**
 * Интерактивные вопросы пользователю
 */

import inquirer from 'inquirer';
import type { MCPClientInfo, MCPServerConfig } from '../connectors/base/connector.interface.js';
import { DEFAULT_LOG_LEVEL } from '../../src/constants.js';

export class InteractivePrompter {
  /**
   * Выбор клиента из списка
   */
  static async promptClientSelection(clients: MCPClientInfo[]): Promise<string> {
    const { selectedClient } = await inquirer.prompt<{ selectedClient: string }>([
      {
        type: 'list',
        name: 'selectedClient',
        message: 'Выберите MCP клиент для подключения:',
        choices: clients.map((client) => ({
          name: `${client.displayName} — ${client.description}`,
          value: client.name,
        })),
      },
    ]);

    return selectedClient;
  }

  /**
   * Запросить конфигурацию сервера
   */
  static async promptServerConfig(
    savedConfig?: Partial<MCPServerConfig>
  ): Promise<Omit<MCPServerConfig, 'projectPath'>> {
    const answers = await inquirer.prompt<{
      token: string;
      orgId: string;
      logLevel: 'debug' | 'info' | 'warn' | 'error';
    }>([
      {
        type: 'password',
        name: 'token',
        message: 'OAuth токен Яндекс.Трекера:',
        mask: '*',
        validate: (input: string) => input.length > 0 || 'Токен обязателен',
      },
      {
        type: 'input',
        name: 'orgId',
        message: 'ID организации:',
        default: savedConfig?.orgId,
        validate: (input: string) => input.length > 0 || 'ID организации обязателен',
      },
      {
        type: 'list',
        name: 'logLevel',
        message: 'Уровень логирования:',
        choices: ['info', 'debug', 'warn', 'error'],
        default: savedConfig?.logLevel || DEFAULT_LOG_LEVEL,
      },
    ]);

    const result: Omit<MCPServerConfig, 'projectPath'> = {
      token: answers.token,
      orgId: answers.orgId,
      logLevel: answers.logLevel,
    };

    if (savedConfig?.apiBase) {
      result.apiBase = savedConfig.apiBase;
    }
    if (savedConfig?.requestTimeout) {
      result.requestTimeout = savedConfig.requestTimeout;
    }

    return result;
  }

  /**
   * Подтверждение (yes/no)
   */
  static async promptConfirmation(message: string, defaultValue = true): Promise<boolean> {
    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue,
      },
    ]);

    return confirmed;
  }

  /**
   * Выбор элемента из списка
   */
  static async promptSelection<T extends string>(
    message: string,
    choices: Array<{ name: string; value: T }>
  ): Promise<T> {
    const { selected } = await inquirer.prompt<{ selected: T }>([
      {
        type: 'list',
        name: 'selected',
        message,
        choices,
      },
    ]);

    return selected;
  }
}
