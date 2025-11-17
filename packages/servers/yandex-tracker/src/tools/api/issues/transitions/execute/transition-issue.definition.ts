/**
 * Определение MCP tool для выполнения перехода задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { TransitionIssueTool } from './transition-issue.tool.js';

/**
 * Definition для TransitionIssueTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class TransitionIssueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return TransitionIssueTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: this.buildIssueKeyParam(),
          transitionId: this.buildTransitionIdParam(),
          comment: this.buildCommentParam(),
          customFields: this.buildCustomFieldsParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueKey', 'transitionId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Выполнить переход задачи Яндекс.Трекера в другой статус. ' +
      '\n\n' +
      '⚠️ ФОРМАТ ПАРАМЕТРОВ:\n' +
      '```json\n' +
      '{\n' +
      '  "issueKey": "PROJ-123",\n' +
      '  "transitionId": "resolve",\n' +
      '  "comment": "Задача выполнена",\n' +
      '  "customFields": {\n' +
      '    "resolution": "fixed"\n' +
      '  },\n' +
      '  "fields": ["key", "summary", "status"]\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Особенности:\n' +
      '- Требуется знание ID перехода (получить через get_issue_transitions)\n' +
      '- Можно добавить комментарий при переходе\n' +
      '- Можно заполнить обязательные поля формы перехода через customFields\n' +
      '- Фильтрация полей ответа для экономии токенов\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Изменить статус задачи (открыть, в работу, закрыть и т.д.)\n' +
      '- Выполнить workflow-переход с комментарием\n' +
      '- Заполнить обязательные поля при переходе (например, resolution при закрытии)\n' +
      '\n' +
      'НЕ используй для:\n' +
      '- Просмотра доступных переходов (используй get_issue_transitions)\n' +
      '- Обновления других полей задачи (используй update_issue)\n' +
      '\n' +
      'ВАЖНО:\n' +
      '- Сначала получи доступные переходы через get_issue_transitions\n' +
      '- Используй ID перехода из списка доступных переходов\n' +
      '- Проверь требуется ли заполнение дополнительных полей при переходе'
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
        '✅ "PROJ-123" - стандартный ключ\n' +
        '✅ "ABC-1" - минимальная длина\n' +
        '✅ "TEST2024-9999" - префикс с цифрами\n' +
        '\n' +
        'Неправильные примеры:\n' +
        '❌ "proj-123" - строчные буквы (должны быть заглавные)\n' +
        '❌ "PROJ_123" - подчеркивание вместо дефиса\n' +
        '❌ "123-PROJ" - номер перед префиксом\n' +
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
   * Построить описание параметра transitionId
   */
  private buildTransitionIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Идентификатор перехода.\n' +
        '\n' +
        'ВАЖНО: ID перехода нужно получить из get_issue_transitions!\n' +
        '\n' +
        'Типичные ID переходов:\n' +
        '- "start" - начать работу\n' +
        '- "resolve" - закрыть как решённую\n' +
        '- "close" - закрыть\n' +
        '- "reopen" - переоткрыть\n' +
        '- "need_info" - требуется информация\n' +
        '\n' +
        'Примечание:\n' +
        '- ID зависят от workflow очереди\n' +
        '- Доступные переходы зависят от текущего статуса\n' +
        '- ВСЕГДА проверяй доступные переходы перед использованием',
      {
        minLength: 1,
        examples: ['start', 'resolve', 'close', 'reopen'],
      }
    );
  }

  /**
   * Построить описание параметра comment
   */
  private buildCommentParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Комментарий при переходе (опционально).\n' +
        '\n' +
        'Используй для:\n' +
        '- Объяснения причины перехода\n' +
        '- Заметок для команды\n' +
        '- Описания выполненной работы\n' +
        '\n' +
        'Примеры:\n' +
        '- "Задача выполнена"\n' +
        '- "Исправлена ошибка в коде"\n' +
        '- "Требуется дополнительная информация от клиента"\n' +
        '- "Переоткрыта из-за регрессии"',
      {
        examples: ['Задача выполнена', 'Требуется дополнительная информация'],
      }
    );
  }

  /**
   * Построить описание параметра customFields
   */
  private buildCustomFieldsParam(): Record<string, unknown> {
    return {
      type: 'object',
      description:
        'Дополнительные поля для заполнения при переходе (опционально).\n' +
        '\n' +
        'Используется для заполнения обязательных полей формы перехода.\n' +
        '\n' +
        'Типичные поля:\n' +
        '- "resolution" - причина закрытия (fixed, duplicate, wontFix, etc.)\n' +
        '- "assignee" - назначить исполнителя\n' +
        '- другие кастомные поля очереди\n' +
        '\n' +
        'Примеры:\n' +
        '```json\n' +
        '{\n' +
        '  "resolution": "fixed"\n' +
        '}\n' +
        '```\n' +
        '\n' +
        '```json\n' +
        '{\n' +
        '  "resolution": "duplicate",\n' +
        '  "assignee": "username"\n' +
        '}\n' +
        '```\n' +
        '\n' +
        'ВАЖНО:\n' +
        '- Проверь требования формы перехода в get_issue_transitions\n' +
        '- Некоторые переходы требуют обязательных полей\n' +
        '- Имена полей зависят от настройки очереди',
      additionalProperties: true,
      examples: [{ resolution: 'fixed' }, { resolution: 'duplicate', assignee: 'username' }],
    };
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
        '- status - статус (название, ключ)\n' +
        '- resolution - причина закрытия\n' +
        '- assignee - исполнитель\n' +
        '- updatedAt - дата обновления\n' +
        '\n' +
        'Вложенные поля (dot-notation):\n' +
        '- status.key - ключ статуса\n' +
        '- assignee.login - логин исполнителя\n' +
        '\n' +
        'Примеры использования:\n' +
        '- ["key", "summary", "status"] - минимальный набор\n' +
        '- ["key", "status.key", "resolution"] - статус после перехода\n' +
        '\n' +
        'Экономия токенов:\n' +
        '- Без фильтрации: ~2000-5000 токенов\n' +
        '- С фильтрацией (5-7 полей): ~200-500 токенов\n' +
        '- Экономия: 80-90%',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key', 'summary', 'status', 'status.key'],
      }),
      {
        minItems: 1,
        examples: [
          ['key', 'summary', 'status'],
          ['key', 'status.key', 'resolution', 'updatedAt'],
        ],
      }
    );
  }
}
