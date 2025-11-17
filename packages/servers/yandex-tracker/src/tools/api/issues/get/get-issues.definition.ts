/**
 * Определение MCP tool для получения задач
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { buildToolName } from '@mcp-framework/core';
import { GetIssuesTool } from './get-issues.tool.js';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';
/**
 * Definition для GetIssuesTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetIssuesDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetIssuesTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: buildToolName('get_issues', MCP_TOOL_PREFIX),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKeys: this.buildIssueKeysParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueKeys'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получение информации о задачах Яндекс.Трекера по массиву ключей. ' +
      '\n\n' +
      '⚠️ ФОРМАТ ПАРАМЕТРОВ:\n' +
      '```json\n' +
      '{\n' +
      '  "issueKeys": ["PROJ-123", "PROJ-456"],\n' +
      '  "fields": ["key", "summary", "status"]\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Для получения ОДНОЙ задачи используй массив из одного элемента:\n' +
      '```json\n' +
      '{\n' +
      '  "issueKeys": ["PROJ-123"]\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Особенности:\n' +
      '- Batch-режим: эффективное получение нескольких задач одним вызовом\n' +
      '- Фильтрация полей: возврат только необходимых полей для экономии токенов\n' +
      '- Partial success: возвращает успешно полученные задачи даже если часть запросов завершилась ошибкой\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Получить детальную информацию о конкретных задачах\n' +
      '- Проверить статус, исполнителя, описание задачи\n' +
      '- Получить несколько задач одновременно (до 100 за раз)\n' +
      '\n' +
      'НЕ используй для:\n' +
      '- Поиска задач по критериям (используй search/filter инструменты)\n' +
      '- Получения всех задач в очереди (используй queue инструменты)'
    );
  }

  /**
   * Построить описание параметра issueKeys
   */
  private buildIssueKeysParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНО МАССИВ! Даже для одной задачи используй ["PROJ-123"], НЕ "PROJ-123".\n' +
        '\n' +
        'Массив ключей задач в формате QUEUE-123.\n' +
        '\n' +
        'Правильные примеры:\n' +
        '✅ ["PROJ-123"] - одна задача\n' +
        '✅ ["PROJ-123", "PROJ-456"] - несколько задач\n' +
        '✅ ["DEVOPS-1", "TEST-999", "ABC-42"] - разные очереди\n' +
        '\n' +
        'Неправильные примеры:\n' +
        '❌ "PROJ-123" - это НЕ массив, будет ошибка!\n' +
        '❌ {"issueKey": "PROJ-123"} - неверная структура\n' +
        '\n' +
        'Формат ключа:\n' +
        '- Префикс очереди: 1-10 заглавных латинских букв и цифр (начинается с буквы)\n' +
        '- Разделитель: дефис "-"\n' +
        '- Номер задачи: число от 1 и выше\n' +
        '\n' +
        'Примеры правильных ключей:\n' +
        '- "PROJ-123" - стандартный ключ\n' +
        '- "ABC-1" - минимальная длина\n' +
        '- "TEST2024-9999" - префикс с цифрами\n' +
        '\n' +
        'Примеры неправильных ключей:\n' +
        '- "proj-123" - строчные буквы (должны быть заглавные)\n' +
        '- "PROJ_123" - подчеркивание вместо дефиса\n' +
        '- "123-PROJ" - номер перед префиксом',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123', 'ABC-1', 'TEST-456'],
      }),
      {
        minItems: 1,
        maxItems: 100,
        examples: [['PROJ-123'], ['PROJ-123', 'PROJ-456', 'PROJ-789']],
      }
    );
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Список полей для возврата (опционально). ' +
        '\n\n' +
        'Если не указан - возвращаются ВСЕ доступные поля задачи (может быть очень много данных). ' +
        'Рекомендуется ALWAYS указывать только необходимые поля для экономии токенов контекста. ' +
        '\n\n' +
        'Основные поля задачи:\n' +
        '- key - ключ задачи (PROJ-123)\n' +
        '- summary - название задачи\n' +
        '- description - описание\n' +
        '- status - статус (название, ключ)\n' +
        '- priority - приоритет\n' +
        '- type - тип задачи\n' +
        '- assignee - исполнитель\n' +
        '- author - автор\n' +
        '- queue - очередь\n' +
        '- project - проект\n' +
        '- sprint - спринт\n' +
        '- epic - эпик\n' +
        '- tags - теги\n' +
        '\n' +
        'Временные поля:\n' +
        '- createdAt - дата создания\n' +
        '- updatedAt - дата обновления\n' +
        '- statusStartTime - время начала текущего статуса\n' +
        '- start - дата начала работы\n' +
        '- end - дедлайн\n' +
        '\n' +
        'Вложенные поля (dot-notation):\n' +
        '- assignee.login - логин исполнителя\n' +
        '- assignee.display - имя исполнителя\n' +
        '- status.key - ключ статуса\n' +
        '- queue.key - ключ очереди\n' +
        '\n' +
        'Примеры использования:\n' +
        '- ["key", "summary", "status"] - минимальный набор\n' +
        '- ["key", "summary", "assignee.login", "status.key"] - с вложенными полями\n' +
        '- ["key", "summary", "description", "assignee", "status", "createdAt"] - расширенный набор\n' +
        '\n' +
        'Экономия токенов:\n' +
        '- Без фильтрации: ~2000-5000 токенов на задачу\n' +
        '- С фильтрацией (5-7 полей): ~200-500 токенов на задачу\n' +
        '- Экономия: 80-90%',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key', 'summary', 'status', 'assignee.login'],
      }),
      {
        minItems: 1,
        examples: [
          ['key', 'summary', 'status'],
          ['key', 'summary', 'assignee.login', 'status.key', 'createdAt'],
        ],
      }
    );
  }
}
