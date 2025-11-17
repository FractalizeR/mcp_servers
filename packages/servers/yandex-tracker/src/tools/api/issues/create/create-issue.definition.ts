/**
 * Определение MCP tool для создания задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { CreateIssueTool } from './create-issue.tool.js';

/**
 * Definition для CreateIssueTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class CreateIssueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return CreateIssueTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          queue: this.buildQueueParam(),
          summary: this.buildSummaryParam(),
          description: this.buildDescriptionParam(),
          assignee: this.buildAssigneeParam(),
          priority: this.buildPriorityParam(),
          type: this.buildTypeParam(),
          customFields: this.buildCustomFieldsParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['queue', 'summary'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Создание новой задачи в Яндекс.Трекере. ' +
      '\n\n' +
      '⚠️ ФОРМАТ ПАРАМЕТРОВ:\n' +
      '```json\n' +
      '{\n' +
      '  "queue": "PROJ",\n' +
      '  "summary": "Название задачи",\n' +
      '  "description": "Детальное описание (опционально)",\n' +
      '  "assignee": "user-login",\n' +
      '  "priority": "normal",\n' +
      '  "type": "task"\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Особенности:\n' +
      '- Минимальные обязательные поля: queue и summary\n' +
      '- Поддержка кастомных полей через customFields\n' +
      '- Фильтрация полей ответа для экономии токенов\n' +
      '- Возвращает полную информацию о созданной задаче\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Создать новую задачу в очереди\n' +
      '- Назначить задачу на исполнителя сразу при создании\n' +
      '- Установить приоритет и тип задачи\n' +
      '- Добавить детальное описание\n' +
      '\n' +
      'НЕ используй для:\n' +
      '- Обновления существующих задач (используй update инструмент)\n' +
      '- Массового создания задач (создавай по одной)'
    );
  }

  /**
   * Построить описание параметра queue
   */
  private buildQueueParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ параметр. Ключ очереди, в которой создаётся задача.\n' +
        '\n' +
        'Формат:\n' +
        '- 1-10 заглавных латинских букв и цифр (начинается с буквы)\n' +
        '- Примеры: "PROJ", "TEST", "DEV2024"\n' +
        '\n' +
        'Правильные примеры:\n' +
        '✅ "PROJ" - стандартный ключ очереди\n' +
        '✅ "ABC" - короткий ключ\n' +
        '✅ "TEST2024" - с цифрами\n' +
        '\n' +
        'Неправильные примеры:\n' +
        '❌ "proj" - строчные буквы (должны быть заглавные)\n' +
        '❌ "PROJ-123" - с дефисом (это ключ задачи, не очереди)\n' +
        '❌ "2TEST" - начинается с цифры',
      {
        pattern: '^[A-Z][A-Z0-9]{0,9}$',
        examples: ['PROJ', 'TEST', 'DEV2024'],
      }
    );
  }

  /**
   * Построить описание параметра summary
   */
  private buildSummaryParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ параметр. Краткое описание задачи (название).\n' +
        '\n' +
        'Рекомендации:\n' +
        '- Лаконичное и понятное название\n' +
        '- Отражает суть задачи\n' +
        '- Обычно 5-10 слов\n' +
        '\n' +
        'Примеры:\n' +
        '✅ "Исправить баг с авторизацией"\n' +
        '✅ "Добавить кнопку экспорта в CSV"\n' +
        '✅ "Обновить документацию API"',
      {
        minLength: 1,
        examples: [
          'Исправить баг с авторизацией',
          'Добавить кнопку экспорта',
          'Обновить документацию',
        ],
      }
    );
  }

  /**
   * Построить описание параметра description
   */
  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Подробное описание задачи (опционально).\n' +
        '\n' +
        'Может содержать:\n' +
        '- Детальное описание проблемы или требований\n' +
        '- Шаги воспроизведения (для багов)\n' +
        '- Критерии приёмки\n' +
        '- Ссылки на документы\n' +
        '- Markdown форматирование\n' +
        '\n' +
        'Примеры:\n' +
        '- "При попытке войти с неверным паролем не отображается сообщение об ошибке"\n' +
        '- "Добавить возможность экспортировать данные в формате CSV. Должна быть кнопка на странице отчётов."',
      {
        examples: [
          'При попытке войти с неверным паролем не отображается сообщение об ошибке',
          'Добавить кнопку экспорта данных в CSV формат',
        ],
      }
    );
  }

  /**
   * Построить описание параметра assignee
   */
  private buildAssigneeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Исполнитель задачи (опционально). Логин пользователя или UID.\n' +
        '\n' +
        'Форматы:\n' +
        '- Логин: "user-login"\n' +
        '- UID: числовой идентификатор\n' +
        '\n' +
        'Примеры:\n' +
        '✅ "ivanov"\n' +
        '✅ "john.doe"\n' +
        '✅ "12345" (UID)',
      {
        examples: ['ivanov', 'john.doe'],
      }
    );
  }

  /**
   * Построить описание параметра priority
   */
  private buildPriorityParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Приоритет задачи (опционально). Ключ приоритета из настроек Трекера.\n' +
        '\n' +
        'Стандартные приоритеты:\n' +
        '- "blocker" - блокер\n' +
        '- "critical" - критический\n' +
        '- "major" - высокий\n' +
        '- "normal" - средний (обычно по умолчанию)\n' +
        '- "minor" - низкий\n' +
        '- "trivial" - минимальный\n' +
        '\n' +
        'Примеры:\n' +
        '✅ "critical"\n' +
        '✅ "normal"\n' +
        '✅ "minor"',
      {
        examples: ['normal', 'critical', 'minor'],
      }
    );
  }

  /**
   * Построить описание параметра type
   */
  private buildTypeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Тип задачи (опционально). Ключ типа из настроек Трекера.\n' +
        '\n' +
        'Стандартные типы:\n' +
        '- "task" - задача (обычно по умолчанию)\n' +
        '- "bug" - баг/дефект\n' +
        '- "epic" - эпик\n' +
        '- "story" - пользовательская история\n' +
        '\n' +
        'Примеры:\n' +
        '✅ "task"\n' +
        '✅ "bug"\n' +
        '✅ "story"',
      {
        examples: ['task', 'bug', 'story'],
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
        'Кастомные поля Трекера (опционально). Дополнительные поля, специфичные для очереди.\n' +
        '\n' +
        'Формат:\n' +
        '```json\n' +
        '{\n' +
        '  "fieldKey1": "value1",\n' +
        '  "fieldKey2": 123,\n' +
        '  "fieldKey3": ["value1", "value2"]\n' +
        '}\n' +
        '```\n' +
        '\n' +
        'Примеры:\n' +
        '- {"estimatedHours": 8} - оценка в часах\n' +
        '- {"tags": ["bug", "urgent"]} - теги\n' +
        '- {"customStatus": "in_review"} - кастомный статус',
      additionalProperties: true,
      examples: [{ estimatedHours: 8 }, { tags: ['bug', 'urgent'] }],
    };
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Список полей для возврата (опционально). ' +
        '\n\n' +
        'Если не указан - возвращаются ВСЕ доступные поля созданной задачи (может быть много данных). ' +
        'Рекомендуется указывать только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Основные поля:\n' +
        '- key - ключ созданной задачи (PROJ-123)\n' +
        '- summary - название\n' +
        '- description - описание\n' +
        '- status - статус\n' +
        '- assignee - исполнитель\n' +
        '- createdAt - дата создания\n' +
        '\n' +
        'Примеры:\n' +
        '- ["key", "summary", "status"] - минимальный набор\n' +
        '- ["key", "summary", "assignee", "createdAt"] - расширенный набор',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key', 'summary', 'status', 'assignee'],
      }),
      {
        minItems: 1,
        examples: [
          ['key', 'summary', 'status'],
          ['key', 'summary', 'assignee', 'createdAt'],
        ],
      }
    );
  }
}
