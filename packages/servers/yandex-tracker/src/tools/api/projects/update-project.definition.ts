/**
 * Определение MCP tool для обновления проекта
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UpdateProjectTool } from './update-project.tool.js';

export class UpdateProjectDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UpdateProjectTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          projectId: this.buildProjectIdParam(),
          name: this.buildNameParam(),
          lead: this.buildLeadParam(),
          status: this.buildStatusParam(),
          description: this.buildDescriptionParam(),
          startDate: this.buildStartDateParam(),
          endDate: this.buildEndDateParam(),
          queueIds: this.buildQueueIdsParam(),
          teamUserIds: this.buildTeamUserIdsParam(),
        },
        required: ['projectId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Обновить существующий проект. Требуются права администратора. ' +
      'Обновляются только переданные поля. ' +
      '\n\n' +
      'Для: изменения настроек проекта, смены руководителя, обновления статуса. ' +
      '\n' +
      'Не для: создания (create_project), удаления (delete_project).'
    );
  }

  private buildProjectIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. ID или ключ проекта для обновления.', {
      minLength: 1,
      examples: ['PROJ'],
    });
  }

  private buildNameParam(): Record<string, unknown> {
    return this.buildStringParam('Новое название проекта (опционально).', {
      examples: ['Updated Project Name'],
    });
  }

  private buildLeadParam(): Record<string, unknown> {
    return this.buildStringParam('Новый ID или login руководителя проекта (опционально).', {
      examples: ['jane.doe'],
    });
  }

  private buildStatusParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Новый статус проекта (опционально). Допустимые значения: draft, in_progress, launched, postponed, at_risk.',
      enum: ['draft', 'in_progress', 'launched', 'postponed', 'at_risk'],
      examples: ['in_progress'],
    };
  }

  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam('Новое описание проекта (опционально).', {
      examples: ['Обновленное описание проекта'],
    });
  }

  private buildStartDateParam(): Record<string, unknown> {
    return this.buildStringParam('Новая дата начала проекта в формате YYYY-MM-DD (опционально).', {
      examples: ['2025-02-01'],
    });
  }

  private buildEndDateParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Новая дата окончания проекта в формате YYYY-MM-DD (опционально).',
      {
        examples: ['2025-11-30'],
      }
    );
  }

  private buildQueueIdsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Новый массив ключей очередей, связанных с проектом (опционально).',
      this.buildStringParam('Ключ очереди', {
        examples: ['QUEUE'],
      }),
      {
        examples: [['QUEUE1', 'QUEUE3']],
      }
    );
  }

  private buildTeamUserIdsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Новый массив ID или login участников проекта (опционально).',
      this.buildStringParam('ID или login пользователя', {
        examples: ['user1'],
      }),
      {
        examples: [['user1', 'user3']],
      }
    );
  }
}
