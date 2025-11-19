/**
 * Определение MCP tool для управления доступом к очереди
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { MANAGE_QUEUE_ACCESS_TOOL_METADATA } from './manage-queue-access.metadata.js';

export class ManageQueueAccessDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return MANAGE_QUEUE_ACCESS_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          queueId: this.buildQueueIdParam(),
          role: this.buildRoleParam(),
          subjects: this.buildSubjectsParam(),
          action: this.buildActionParam(),
        },
        required: ['queueId', 'role', 'subjects', 'action'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Управление правами доступа к очереди: добавление/удаление пользователей в/из ролей. ' +
      'Требуются права администратора очереди. ' +
      '\n\n' +
      'Для: предоставления/отзыва доступа пользователей к очереди. ' +
      '\n' +
      'Не для: создания очереди (create_queue), изменения параметров (update_queue).'
    );
  }

  private buildQueueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ очереди.', {
      examples: ['PROJ'],
    });
  }

  private buildRoleParam(): Record<string, unknown> {
    return {
      type: 'string',
      enum: ['queue-lead', 'team-member', 'follower', 'access'],
      description:
        '⚠️ ОБЯЗАТЕЛЬНЫЙ. Роль в очереди. ' +
        'queue-lead - руководитель, team-member - член команды, follower - наблюдатель, access - доступ.',
      examples: ['team-member'],
    };
  }

  private buildSubjectsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Массив ID пользователей или групп.',
      this.buildStringParam('ID пользователя или группы', {
        examples: ['user123'],
      }),
      {
        minItems: 1,
        examples: [['user123', 'user456']],
      }
    );
  }

  private buildActionParam(): Record<string, unknown> {
    return {
      type: 'string',
      enum: ['add', 'remove'],
      description: '⚠️ ОБЯЗАТЕЛЬНЫЙ. Действие: add - добавить, remove - удалить.',
      examples: ['add'],
    };
  }
}
