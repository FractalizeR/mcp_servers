/**
 * Generic interactive prompter for collecting MCP server configuration
 * @packageDocumentation
 */

import inquirer from 'inquirer';
import type { BaseMCPServerConfig, MCPClientInfo, ConfigPromptDefinition } from '../types.js';

/**
 * Generic интерактивный сборщик конфигурации для MCP серверов
 *
 * @example
 * ```typescript
 * // Определяем промпты для Yandex Tracker
 * const ytPrompts: ConfigPromptDefinition<YandexTrackerConfig>[] = [
 *   {
 *     name: 'token',
 *     type: 'password',
 *     message: 'OAuth токен:',
 *     validate: (v) => v.length > 0 || 'Токен обязателен',
 *   },
 *   {
 *     name: 'orgId',
 *     type: 'input',
 *     message: 'ID организации:',
 *   },
 * ];
 *
 * // Используем prompter
 * const prompter = new InteractivePrompter(ytPrompts);
 * const config = await prompter.promptServerConfig();
 * ```
 *
 * @template TConfig - Тип конфигурации MCP сервера (расширяет BaseMCPServerConfig)
 */
export class InteractivePrompter<TConfig extends BaseMCPServerConfig> {
  /**
   * @param configPrompts - Определения промптов для сбора конфигурации
   */
  constructor(private readonly configPrompts: ConfigPromptDefinition<TConfig>[]) {}

  /**
   * Собрать конфигурацию MCP сервера через интерактивные промпты
   *
   * @param savedConfig - Ранее сохраненная конфигурация (для значений по умолчанию)
   * @returns Собранная конфигурация (без projectPath, который добавляется позже)
   *
   * @example
   * ```typescript
   * const savedConfig = await configManager.load();
   * const config = await prompter.promptServerConfig(savedConfig);
   * // config = { token: '...', orgId: '...', apiBase: '...', logLevel: 'info' }
   * ```
   */
  async promptServerConfig(savedConfig?: Partial<TConfig>): Promise<Omit<TConfig, 'projectPath'>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions: any[] = this.configPrompts.map((prompt) => {
      const question: Record<string, unknown> = {
        type: prompt.type,
        name: String(prompt.name),
        message: prompt.message,
      };

      // Add default value
      if (prompt.default !== undefined) {
        if (typeof prompt.default === 'function') {
          question['default'] = (): TConfig[keyof TConfig] | undefined => {
            const defaultFn = prompt.default as (
              savedConfig?: Partial<TConfig>
            ) => TConfig[keyof TConfig] | undefined;
            return defaultFn(savedConfig);
          };
        } else {
          question['default'] = prompt.default;
        }
      }

      // Add validate function
      if (prompt.validate !== undefined) {
        question['validate'] = prompt.validate;
      }

      // Add choices
      if (prompt.choices !== undefined) {
        question['choices'] = prompt.choices;
      }

      // Add when condition
      if (prompt.when !== undefined) {
        question['when'] = prompt.when;
      }

      // Add mask (password fields)
      if (prompt.mask !== undefined) {
        question['mask'] = prompt.mask;
      } else if (prompt.type === 'password') {
        question['mask'] = '*';
      }

      return question;
    });

    const answers = await inquirer.prompt(questions);
    return answers as Omit<TConfig, 'projectPath'>;
  }

  /**
   * Выбор MCP клиента из списка установленных
   *
   * @param clients - Список доступных MCP клиентов
   * @returns Имя выбранного клиента
   *
   * @example
   * ```typescript
   * const installed = await registry.findInstalled();
   * const clientName = await InteractivePrompter.promptClientSelection(installed);
   * // clientName = 'claude-desktop' | 'claude-code' | ...
   * ```
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
   * Запросить подтверждение (yes/no) у пользователя
   *
   * @param message - Сообщение для отображения
   * @param defaultValue - Значение по умолчанию (true = yes, false = no)
   * @returns true если пользователь подтвердил, false иначе
   *
   * @example
   * ```typescript
   * const shouldOverwrite = await InteractivePrompter.promptConfirmation(
   *   'Конфигурация уже существует. Перезаписать?',
   *   false
   * );
   * ```
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
   * Выбор из списка вариантов
   *
   * @param message - Сообщение для отображения
   * @param choices - Список вариантов выбора
   * @returns Выбранное значение
   *
   * @example
   * ```typescript
   * const logLevel = await InteractivePrompter.promptSelection(
   *   'Выберите уровень логирования:',
   *   [
   *     { name: 'Debug', value: 'debug' },
   *     { name: 'Info', value: 'info' },
   *     { name: 'Warning', value: 'warn' },
   *   ]
   * );
   * ```
   *
   * @template T - Тип возвращаемого значения (строка)
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
