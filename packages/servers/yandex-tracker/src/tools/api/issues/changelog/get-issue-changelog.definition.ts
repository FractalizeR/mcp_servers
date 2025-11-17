/**
 * Определение MCP tool для получения истории изменений задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';

import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';
import { GetIssueChangelogTool } from './get-issue-changelog.tool.js';

/**
 * Definition для GetIssueChangelogTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetIssueChangelogDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetIssueChangelogTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: buildToolName('get_issue_changelog', MCP_TOOL_PREFIX),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: this.buildIssueKeyParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueKey'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получение истории изменений задачи Яндекс.Трекера. ' +
      '\n\n' +
      '⚠️ ФОРМАТ ПАРАМЕТРОВ:\n' +
      '```json\n' +
      '{\n' +
      '  "issueKey": "PROJ-123",\n' +
      '  "fields": ["id", "updatedAt", "updatedBy", "type", "fields"]\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Особенности:\n' +
      '- Возвращает полную историю изменений задачи в хронологическом порядке\n' +
      '- Включает информацию о том, кто и когда изменил задачу\n' +
      '- Показывает какие поля были изменены и их старые/новые значения\n' +
      '- Фильтрация полей: возврат только необходимых полей для экономии токенов\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Узнать историю изменений задачи\n' +
      '- Проследить, кто и когда менял статус, приоритет или другие поля\n' +
      '- Найти когда задача была создана или перемещена\n' +
      '- Получить информацию об изменениях для аудита\n' +
      '\n' +
      'НЕ используй для:\n' +
      '- Получения текущего состояния задачи (используй get_issues)\n' +
      '- Получения комментариев (используй отдельный инструмент для комментариев, если доступен)'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ задачи для получения истории изменений', {
      pattern: '^[A-Z][A-Z0-9]+-\\d+$',
      examples: ['PROJ-123', 'ABC-456', 'TEST-1'],
    });
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Список полей для возврата (опционально). ' +
        '\n\n' +
        'Если не указан - возвращаются ВСЕ доступные поля записи истории (может быть много данных). ' +
        'Рекомендуется ALWAYS указывать только необходимые поля для экономии токенов контекста. ' +
        '\n\n' +
        'Основные поля записи истории:\n' +
        '- id - идентификатор записи\n' +
        '- updatedAt - дата и время изменения\n' +
        '- updatedBy - пользователь, внёсший изменение\n' +
        '- type - тип изменения (IssueUpdated, IssueCreated, IssueMoved и т.д.)\n' +
        '- transport - способ внесения изменения (web, email, api)\n' +
        '- fields - список изменённых полей с их старыми и новыми значениями\n' +
        '- issue - информация о задаче (id, key, display)\n' +
        '\n' +
        'Дополнительные поля:\n' +
        '- attachments - вложения (если добавлены/удалены)\n' +
        '- comments - комментарии (если добавлены)\n' +
        '- worklog - записи времени (если добавлены)\n' +
        '- messages - сообщения\n' +
        '- links - связи задач\n' +
        '- ranks - ранги\n' +
        '\n' +
        'Вложенные поля (dot-notation):\n' +
        '- updatedBy.login - логин пользователя\n' +
        '- updatedBy.display - имя пользователя\n' +
        '- issue.key - ключ задачи\n' +
        '\n' +
        'Примеры использования:\n' +
        '- ["id", "updatedAt", "updatedBy", "type"] - минимальный набор\n' +
        '- ["id", "updatedAt", "updatedBy.login", "type", "fields"] - с вложенными полями и изменениями\n' +
        '- ["id", "updatedAt", "updatedBy", "type", "transport", "fields", "comments"] - расширенный набор\n' +
        '\n' +
        'Экономия токенов:\n' +
        '- Без фильтрации: ~1000-3000 токенов на запись\n' +
        '- С фильтрацией (5-7 полей): ~100-300 токенов на запись\n' +
        '- Экономия: 70-90%',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['id', 'updatedAt', 'updatedBy', 'type', 'fields'],
      }),
      {
        minItems: 1,
        examples: [
          ['id', 'updatedAt', 'updatedBy', 'type'],
          ['id', 'updatedAt', 'updatedBy.login', 'type', 'fields'],
        ],
      }
    );
  }
}
