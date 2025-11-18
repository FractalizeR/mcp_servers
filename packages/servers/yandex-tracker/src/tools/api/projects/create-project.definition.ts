/**
 * Определение MCP tool для создания проекта
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { CreateProjectTool } from './create-project.tool.js';

export class CreateProjectDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return CreateProjectTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          key: this.buildKeyParam(),
          name: this.buildNameParam(),
          lead: this.buildLeadParam(),
          status: this.buildStatusParam(),
          description: this.buildDescriptionParam(),
          startDate: this.buildStartDateParam(),
          endDate: this.buildEndDateParam(),
          queueIds: this.buildQueueIdsParam(),
          teamUserIds: this.buildTeamUserIdsParam(),
        },
        required: ['key', 'name', 'lead'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Создать новый проект. Требуются права администратора. ' +
      'Обязательные поля: key, name, lead. ' +
      '\n\n' +
      'Для: создания нового проекта для команды/инициативы. ' +
      '\n' +
      'Не для: обновления (update_project), получения (get_project).'
    );
  }

  private buildKeyParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Уникальный ключ проекта.', {
      minLength: 1,
      examples: ['PROJ'],
    });
  }

  private buildNameParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Название проекта.', {
      minLength: 1,
      examples: ['My Project'],
    });
  }

  private buildLeadParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. ID или login руководителя проекта.', {
      examples: ['john.doe'],
    });
  }

  private buildStatusParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Статус проекта (опционально). Допустимые значения: draft, in_progress, launched, postponed, at_risk.',
      enum: ['draft', 'in_progress', 'launched', 'postponed', 'at_risk'],
      examples: ['draft'],
    };
  }

  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam('Описание проекта (опционально).', {
      examples: ['Проект для разработки новой функциональности'],
    });
  }

  private buildStartDateParam(): Record<string, unknown> {
    return this.buildStringParam('Дата начала проекта в формате YYYY-MM-DD (опционально).', {
      examples: ['2025-01-01'],
    });
  }

  private buildEndDateParam(): Record<string, unknown> {
    return this.buildStringParam('Дата окончания проекта в формате YYYY-MM-DD (опционально).', {
      examples: ['2025-12-31'],
    });
  }

  private buildQueueIdsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Массив ключей очередей, связанных с проектом (опционально).',
      this.buildStringParam('Ключ очереди', {
        examples: ['QUEUE'],
      }),
      {
        examples: [['QUEUE1', 'QUEUE2']],
      }
    );
  }

  private buildTeamUserIdsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Массив ID или login участников проекта (опционально).',
      this.buildStringParam('ID или login пользователя', {
        examples: ['user1'],
      }),
      {
        examples: [['user1', 'user2']],
      }
    );
  }
}
