/**
 * Определение MCP tool для массовой смены статусов задач
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { BulkTransitionIssuesTool } from './bulk-transition-issues.tool.js';

/**
 * Definition для BulkTransitionIssuesTool
 */
export class BulkTransitionIssuesDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return BulkTransitionIssuesTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issues: this.buildIssuesParam(),
          transition: this.buildTransitionParam(),
          values: this.buildValuesParam(),
        },
        required: ['issues', 'transition'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Массовая смена статусов нескольких задач одновременно через workflow-переходы. ' +
      'Операция выполняется асинхронно на сервере и возвращает operationId для проверки статуса. ' +
      'Используй get_bulk_change_status для мониторинга прогресса. ' +
      '\n\n' +
      'Для: изменения статусов множества задач с соблюдением workflow (start_progress, close, reopen). ' +
      '\n' +
      'Не для: обновления других полей (используй bulk_update_issues) или одной задачи (используй execute_transition).'
    );
  }

  /**
   * Построить описание параметра issues
   */
  private buildIssuesParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Массив ключей задач для перевода. Формат: QUEUE-123. ' +
        'Все задачи должны поддерживать указанный переход.',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123'],
      }),
      {
        minItems: 1,
        examples: [['PROJ-123', 'PROJ-456', 'PROJ-789']],
      }
    );
  }

  /**
   * Построить описание параметра transition
   */
  private buildTransitionParam(): Record<string, unknown> {
    return this.buildStringParam(
      'ID или ключ перехода. ' +
        'Типичные значения: "start_progress" (начать работу), "need_info" (требуется информация), ' +
        '"close" (закрыть), "reopen" (переоткрыть). ' +
        'Доступные переходы зависят от текущего статуса задачи и настроек workflow.',
      {
        minLength: 1,
        examples: ['start_progress', 'close', 'need_info', 'reopen'],
      }
    );
  }

  /**
   * Построить описание параметра values
   */
  private buildValuesParam(): Record<string, unknown> {
    return {
      type: 'object',
      additionalProperties: true,
      description:
        'Опциональные поля для обновления при переходе. ' +
        'Используется когда переход требует установки дополнительных полей. ' +
        'Например, при закрытии задачи может требоваться установка resolution.',
      properties: {
        resolution: {
          type: 'string',
          description:
            'Резолюция (для перехода в статус "Закрыт"). ' +
            'Типичные значения: "fixed", "wontFix", "duplicate", "workingAsIntended".',
          examples: ['fixed', 'wontFix', 'duplicate'],
        },
        comment: {
          type: 'string',
          description: 'Комментарий к переходу. Будет добавлен к задачам.',
          examples: ['Закрыто после исправления'],
        },
        assignee: {
          type: 'string',
          description: 'Исполнитель (логин пользователя)',
          examples: ['user-login'],
        },
        priority: {
          type: 'string',
          description: 'Приоритет',
          examples: ['normal', 'critical'],
        },
      },
      examples: [
        {
          resolution: 'fixed',
          comment: 'Исправлено в версии 2.0',
        },
      ],
    };
  }
}
