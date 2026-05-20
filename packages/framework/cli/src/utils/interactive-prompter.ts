/**
 * Generic interactive prompter for collecting MCP server configuration
 * @packageDocumentation
 */

import inquirer from 'inquirer';
import type { MCPClientInfo, ConfigPromptDefinition } from '../types.js';

/**
 * Generic интерактивный сборщик конфигурации MCP сервера.
 *
 * @template TDomainConfig - Тип доменной конфигурации (произвольный объект).
 *
 * @example
 * ```typescript
 * const prompts: ConfigPromptDefinition<{ token: string; orgId: string }>[] = [
 *   { name: 'token', type: 'password', message: 'OAuth токен:' },
 *   { name: 'orgId', type: 'input', message: 'ID организации:' },
 * ];
 *
 * const prompter = new InteractivePrompter(prompts);
 * const config = await prompter.promptServerConfig();
 * ```
 */
export class InteractivePrompter<TDomainConfig extends object> {
  /**
   * @param configPrompts - Определения промптов для сбора конфигурации
   */
  constructor(private readonly configPrompts: ConfigPromptDefinition<TDomainConfig>[]) {}

  /**
   * Собрать конфигурацию через интерактивные промпты.
   *
   * @param savedConfig - Ранее сохраненная конфигурация (для значений по умолчанию)
   * @returns Собранная доменная конфигурация
   */
  async promptServerConfig(savedConfig?: Partial<TDomainConfig>): Promise<TDomainConfig> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions: any[] = this.configPrompts.map((prompt) => {
      const question: Record<string, unknown> = {
        type: prompt.type,
        name: String(prompt.name),
        message: prompt.message,
      };

      if (prompt.default !== undefined) {
        if (typeof prompt.default === 'function') {
          question['default'] = (): TDomainConfig[keyof TDomainConfig] | undefined => {
            const defaultFn = prompt.default as (
              savedConfig?: Partial<TDomainConfig>
            ) => TDomainConfig[keyof TDomainConfig] | undefined;
            return defaultFn(savedConfig);
          };
        } else {
          question['default'] = prompt.default;
        }
      }

      if (prompt.validate !== undefined) {
        question['validate'] = prompt.validate;
      }

      if (prompt.choices !== undefined) {
        question['choices'] = prompt.choices;
      }

      if (prompt.when !== undefined) {
        question['when'] = prompt.when;
      }

      if (prompt.mask !== undefined) {
        question['mask'] = prompt.mask;
      } else if (prompt.type === 'password') {
        question['mask'] = '*';
      }

      return question;
    });

    const answers = await inquirer.prompt(questions);
    return answers as TDomainConfig;
  }

  /**
   * Выбор MCP клиента из списка установленных.
   *
   * @param clients - Список доступных MCP клиентов
   * @returns Имя выбранного клиента
   */
  static async promptClientSelection(clients: MCPClientInfo[]): Promise<string> {
    const { selectedClient } = await inquirer.prompt<{ selectedClient: string }>([
      {
        type: 'select',
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
   * Запросить подтверждение (yes/no) у пользователя.
   *
   * @param message - Сообщение для отображения
   * @param defaultValue - Значение по умолчанию (true = yes, false = no)
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
   * Выбор из списка вариантов.
   *
   * @param message - Сообщение для отображения
   * @param choices - Список вариантов выбора
   * @returns Выбранное значение
   */
  static async promptSelection<T extends string>(
    message: string,
    choices: Array<{ name: string; value: T }>
  ): Promise<T> {
    const { selected } = await inquirer.prompt<{ selected: T }>([
      {
        type: 'select',
        name: 'selected',
        message,
        choices,
      },
    ]);

    return selected;
  }
}
