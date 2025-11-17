/**
 * Определение MCP tool для обновления задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UpdateIssueTool } from './update-issue.tool.js';

/**
 * Definition для UpdateIssueTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class UpdateIssueDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UpdateIssueTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: this.buildIssueKeyParam(),
          summary: this.buildSummaryParam(),
          description: this.buildDescriptionParam(),
          assignee: this.buildAssigneeParam(),
          priority: this.buildPriorityParam(),
          type: this.buildTypeParam(),
          status: this.buildStatusParam(),
          customFields: this.buildCustomFieldsParam(),
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
      'Обновление существующей задачи в Яндекс.Трекере. ' +
      '\n\n' +
      '⚠️ ФОРМАТ ПАРАМЕТРОВ:\n' +
      '```json\n' +
      '{\n' +
      '  "issueKey": "PROJ-123",\n' +
      '  "summary": "Новое название задачи",\n' +
      '  "assignee": "user-login",\n' +
      '  "status": "inProgress"\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Особенности:\n' +
      '- Обновляются только указанные поля (partial update)\n' +
      '- Поддержка стандартных и кастомных полей Трекера\n' +
      '- Фильтрация полей в ответе для экономии токенов\n' +
      '- Валидация данных перед отправкой\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Изменить название, описание задачи\n' +
      '- Назначить/изменить исполнителя\n' +
      '- Обновить приоритет, тип, статус\n' +
      '- Обновить кастомные поля Трекера\n' +
      '\n' +
      'НЕ используй для:\n' +
      '- Создания новой задачи (используй create_issue)\n' +
      '- Массового обновления задач (обновляй по одной)\n' +
      '- Перехода по workflow (используй execute_transition для смены статуса с учётом правил)'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ существующей задачи в формате QUEUE-123.\n' +
        '\n' +
        'Правильные примеры:\n' +
        '✅ "PROJ-123" - стандартный ключ\n' +
        '✅ "ABC-1" - минимальная длина\n' +
        '✅ "TEST2024-9999" - префикс с цифрами\n' +
        '\n' +
        'Неправильные примеры:\n' +
        '❌ "proj-123" - строчные буквы\n' +
        '❌ "PROJ_123" - подчеркивание вместо дефиса',
      {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123', 'ABC-456', 'TEST-1'],
      }
    );
  }

  /**
   * Построить описание параметра summary
   */
  private buildSummaryParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Краткое описание задачи (заголовок).\n' +
        '\n' +
        'Рекомендации:\n' +
        '- Начинайте с глагола (Исправить, Добавить, Обновить)\n' +
        '- Будьте конкретны, но кратки\n' +
        '- Обычно 5-10 слов\n' +
        '\n' +
        'Примеры хороших summary:\n' +
        '✅ "Исправить ошибку 404 на странице профиля"\n' +
        '✅ "Добавить поддержку темной темы"\n' +
        '✅ "Обновить зависимости до последних версий"',
      {
        minLength: 1,
        examples: ['Исправить ошибку авторизации', 'Добавить новую функцию экспорта'],
      }
    );
  }

  /**
   * Построить описание параметра description
   */
  private buildDescriptionParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Подробное описание задачи с контекстом, требованиями и деталями.\n' +
        '\n' +
        'Может содержать:\n' +
        '- Markdown разметку (заголовки, списки, ссылки)\n' +
        '- Шаги воспроизведения (для багов)\n' +
        '- Требования и критерии готовности\n' +
        '- Технические детали\n' +
        '\n' +
        'Пример:\n' +
        '```\n' +
        '## Проблема\n' +
        'При попытке входа появляется ошибка 401.\n' +
        '\n' +
        '## Шаги воспроизведения\n' +
        '1. Открыть страницу /login\n' +
        '2. Ввести данные\n' +
        '3. Нажать "Войти"\n' +
        '\n' +
        '## Ожидаемый результат\n' +
        'Успешная авторизация\n' +
        '```',
      {
        examples: [
          'Подробное описание с требованиями и критериями готовности',
          '## Контекст\nОписание проблемы\n\n## Решение\nПредлагаемое решение',
        ],
      }
    );
  }

  /**
   * Построить описание параметра assignee
   */
  private buildAssigneeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Логин или UID пользователя в Яндекс.Трекере.\n' +
        '\n' +
        'Можно указать:\n' +
        '- Логин пользователя: "ivanov-ivan"\n' +
        '- UID пользователя: "1234567890"\n' +
        '\n' +
        'Примеры:\n' +
        '✅ "ivanov-ivan" - логин пользователя\n' +
        '✅ "1234567890" - UID пользователя\n' +
        '\n' +
        'Для снятия исполнителя используй пустую строку "".',
      {
        minLength: 1,
        examples: ['user-login', '1234567890'],
      }
    );
  }

  /**
   * Построить описание параметра priority
   */
  private buildPriorityParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ приоритета в Яндекс.Трекере.\n' +
        '\n' +
        'Стандартные значения:\n' +
        '- "critical" - Критический\n' +
        '- "major" - Важный\n' +
        '- "normal" - Средний\n' +
        '- "minor" - Незначительный\n' +
        '- "trivial" - Тривиальный\n' +
        '\n' +
        'Примечание: Доступные приоритеты могут отличаться в зависимости от настроек очереди.',
      {
        minLength: 1,
        examples: ['critical', 'major', 'normal', 'minor', 'trivial'],
      }
    );
  }

  /**
   * Построить описание параметра type
   */
  private buildTypeParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ типа задачи в Яндекс.Трекере.\n' +
        '\n' +
        'Стандартные типы:\n' +
        '- "task" - Задача\n' +
        '- "bug" - Баг\n' +
        '- "epic" - Эпик\n' +
        '- "story" - История\n' +
        '\n' +
        'Примечание: Доступные типы могут отличаться в зависимости от настроек очереди.',
      {
        minLength: 1,
        examples: ['task', 'bug', 'epic', 'story'],
      }
    );
  }

  /**
   * Построить описание параметра status
   */
  private buildStatusParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ статуса в Яндекс.Трекере.\n' +
        '\n' +
        'Типичные статусы:\n' +
        '- "open" - Открыта\n' +
        '- "inProgress" - В работе\n' +
        '- "needInfo" - Нужна информация\n' +
        '- "resolved" - Решена\n' +
        '- "closed" - Закрыта\n' +
        '\n' +
        '⚠️ ВАЖНО:\n' +
        '- Прямое изменение статуса может не соблюдать правила workflow\n' +
        '- Для корректной смены статуса используй execute_transition\n' +
        '- Доступные статусы зависят от настроек очереди',
      {
        minLength: 1,
        examples: ['open', 'inProgress', 'resolved', 'closed'],
      }
    );
  }

  /**
   * Построить описание параметра customFields
   */
  private buildCustomFieldsParam(): Record<string, unknown> {
    return {
      type: 'object',
      additionalProperties: true,
      description:
        'Кастомные поля Яндекс.Трекера (опционально).\n' +
        '\n' +
        'Формат: объект с ключами - названиями полей, значениями - данными.\n' +
        '\n' +
        'Примеры:\n' +
        '```json\n' +
        '{\n' +
        '  "storyPoints": 5,\n' +
        '  "environment": "production",\n' +
        '  "testCaseUrl": "https://example.com/test/123"\n' +
        '}\n' +
        '```\n' +
        '\n' +
        'Типы значений:\n' +
        '- Строка: "production"\n' +
        '- Число: 5\n' +
        '- Булево: true/false\n' +
        '- Массив: ["tag1", "tag2"]\n' +
        '- Объект: {"key": "value"}\n' +
        '\n' +
        'Примечание: Названия и типы кастомных полей зависят от настроек очереди.',
      examples: [
        {
          storyPoints: 5,
          environment: 'production',
        },
        {
          testCaseUrl: 'https://example.com/test/123',
          severity: 'high',
        },
      ],
    };
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Список полей для возврата в ответе (опционально). ' +
        '\n\n' +
        'Если не указан - возвращаются ВСЕ доступные поля обновлённой задачи. ' +
        'Рекомендуется указывать только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Основные поля:\n' +
        '- key - ключ задачи\n' +
        '- summary - название\n' +
        '- description - описание\n' +
        '- status - статус\n' +
        '- assignee - исполнитель\n' +
        '- priority - приоритет\n' +
        '- type - тип задачи\n' +
        '- updatedAt - дата обновления\n' +
        '\n' +
        'Вложенные поля (dot-notation):\n' +
        '- assignee.login - логин исполнителя\n' +
        '- status.key - ключ статуса\n' +
        '\n' +
        'Примеры:\n' +
        '- ["key", "summary", "status"] - минимальный набор\n' +
        '- ["key", "summary", "assignee.login", "updatedAt"] - с вложенными полями\n' +
        '\n' +
        'Экономия токенов:\n' +
        '- Без фильтрации: ~2000-5000 токенов\n' +
        '- С фильтрацией (5-7 полей): ~200-500 токенов\n' +
        '- Экономия: 80-90%',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key', 'summary', 'status', 'assignee.login'],
      }),
      {
        minItems: 1,
        examples: [
          ['key', 'summary', 'status'],
          ['key', 'summary', 'assignee.login', 'status.key', 'updatedAt'],
        ],
      }
    );
  }
}
