/**
 * Определение MCP tool для получения доступных переходов статусов задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';

import { GetIssueTransitionsTool } from './get-issue-transitions.tool.js';

/**
 * Definition для GetIssueTransitionsTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetIssueTransitionsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetIssueTransitionsTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
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
      'Получение доступных переходов статусов (workflow transitions) для задачи Яндекс.Трекера. ' +
      '\n\n' +
      '⚠️ ФОРМАТ ПАРАМЕТРОВ:\n' +
      '```json\n' +
      '{\n' +
      '  "issueKey": "PROJ-123",\n' +
      '  "fields": ["id", "to"]\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Особенности:\n' +
      '- Возвращает только доступные из текущего статуса переходы\n' +
      '- Фильтрация полей: возврат только необходимых полей для экономии токенов\n' +
      '- Для каждого перехода возвращается целевой статус (to) и его параметры\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Узнать, в какие статусы можно перевести задачу\n' +
      '- Получить список доступных workflow действий\n' +
      '- Проверить возможность перевода задачи в определенный статус\n' +
      '\n' +
      'НЕ используй для:\n' +
      '- Выполнения перехода (используй execute transition инструменты)\n' +
      '- Получения истории изменений статусов (используй changelog инструменты)'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ задачи в формате QUEUE-123.\n' +
        '\n' +
        'Правильные примеры:\n' +
        '✅ "PROJ-123"\n' +
        '✅ "DEVOPS-1"\n' +
        '✅ "TEST2024-999"\n' +
        '\n' +
        'Неправильные примеры:\n' +
        '❌ ["PROJ-123"] - это массив, нужна строка\n' +
        '❌ "proj-123" - строчные буквы (должны быть заглавные)\n' +
        '❌ "PROJ_123" - подчеркивание вместо дефиса\n' +
        '\n' +
        'Формат ключа:\n' +
        '- Префикс очереди: 1-10 заглавных латинских букв и цифр (начинается с буквы)\n' +
        '- Разделитель: дефис "-"\n' +
        '- Номер задачи: число от 1 и выше',
      {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123', 'ABC-1', 'TEST-456'],
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
        'Если не указан - возвращаются ВСЕ доступные поля перехода (может быть много данных). ' +
        'Рекомендуется ALWAYS указывать только необходимые поля для экономии токенов контекста. ' +
        '\n\n' +
        'Основные поля перехода:\n' +
        '- id - идентификатор перехода\n' +
        '- self - URL перехода\n' +
        '- to - целевой статус (объект Status)\n' +
        '- screen - форма для заполнения при переходе (если требуется)\n' +
        '\n' +
        'Вложенные поля (dot-notation):\n' +
        '- to.key - ключ целевого статуса\n' +
        '- to.display - название целевого статуса\n' +
        '- screen.id - ID формы\n' +
        '\n' +
        'Примеры использования:\n' +
        '- ["id", "to"] - минимальный набор (ID перехода + целевой статус)\n' +
        '- ["id", "to.key", "to.display"] - с вложенными полями статуса\n' +
        '- ["id", "to", "screen"] - расширенный набор с формой\n' +
        '\n' +
        'Экономия токенов:\n' +
        '- Без фильтрации: ~500-1000 токенов на переход\n' +
        '- С фильтрацией (2-3 поля): ~50-150 токенов на переход\n' +
        '- Экономия: 70-90%',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['id', 'to', 'to.key', 'to.display', 'screen'],
      }),
      {
        minItems: 1,
        examples: [
          ['id', 'to'],
          ['id', 'to.key', 'to.display'],
          ['id', 'to', 'screen'],
        ],
      }
    );
  }
}
