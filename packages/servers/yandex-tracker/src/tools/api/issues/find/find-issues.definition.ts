/**
 * Определение MCP tool для поиска задач
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';

import { FindIssuesTool } from './find-issues.tool.js';
/**
 * Definition для FindIssuesTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает (query/filter/keys/queue)
 * - Язык запросов Трекера с примерами
 * - Формат ответа
 */
export class FindIssuesDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return FindIssuesTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          query: this.buildQueryParam(),
          filter: this.buildFilterParam(),
          keys: this.buildKeysParam(),
          queue: this.buildQueueParam(),
          filterId: this.buildFilterIdParam(),
          order: this.buildOrderParam(),
          perPage: this.buildPerPageParam(),
          page: this.buildPageParam(),
          expand: this.buildExpandParam(),
          fields: this.buildFieldsParam(),
        },
        // Хотя бы один параметр поиска должен быть указан (валидация в schema)
        required: [],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Поиск задач в Яндекс.Трекере по различным критериям. ' +
      '\n\n' +
      'Способы поиска (укажи ОДИН из них):\n' +
      '1. query - язык запросов Трекера (мощный поиск с логическими операторами)\n' +
      '2. filter - объект с фильтрами по полям (простой key-value поиск)\n' +
      '3. keys - список конкретных ключей задач\n' +
      '4. queue - все задачи в очереди\n' +
      '5. filterId - ID сохранённого фильтра\n' +
      '\n' +
      'Особенности:\n' +
      '- Возвращает массив задач (не batch-режим)\n' +
      '- Поддержка пагинации (perPage, page)\n' +
      '- Фильтрация полей для экономии токенов\n' +
      '- Сортировка результатов (order)\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Найти задачи по условиям ("все задачи автора", "задачи без исполнителя")\n' +
      '- Получить задачи с определённым статусом/приоритетом\n' +
      '- Применить сложные фильтры с логическими операторами\n' +
      '\n' +
      'НЕ используй для:\n' +
      '- Получения конкретных задач по ключам (используй fyt_mcp_get_issues - эффективнее)'
    );
  }

  /**
   * Построить описание параметра query
   */
  private buildQueryParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Язык запросов Яндекс.Трекера для мощного поиска задач. ' +
        '\n\n' +
        'Логические операторы:\n' +
        '- AND - оба условия (можно опустить, просто пробел)\n' +
        '- OR - хотя бы одно условие\n' +
        '- Скобки () для группировки\n' +
        '\n' +
        'Функции:\n' +
        '- empty() - пустое значение (не задано)\n' +
        '- notEmpty() - любое непустое значение\n' +
        '- me() - текущий пользователь\n' +
        '- now() - текущее время\n' +
        '- today() - сегодня\n' +
        '- week() - текущая неделя\n' +
        '- month() - текущий месяц\n' +
        '- unresolved() - резолюция не задана\n' +
        '\n' +
        'Операторы сравнения:\n' +
        '- ! - не равно\n' +
        '- > - больше\n' +
        '- < - меньше\n' +
        '- >= - больше или равно\n' +
        '- <= - меньше или равно\n' +
        '\n' +
        'Примеры:\n' +
        '- "Author: me() Resolution: empty()" - мои неразрешённые задачи\n' +
        '- "Assignee: me() Deadline: week()" - назначенные мне на эту неделю\n' +
        '- "(Followers: me() OR Assignee: me()) AND Resolution: empty()" - активные задачи где я участвую\n' +
        '- "Priority: Critical, Blocker Status: Open" - критичные открытые задачи\n' +
        '- "Created: >2024-01-01 Queue: PROJ" - задачи созданные после даты\n' +
        '\n' +
        'ВАЖНО: Это самый мощный способ поиска, используй его для сложных запросов.',
    };
  }

  /**
   * Построить описание параметра filter
   */
  private buildFilterParam(): Record<string, unknown> {
    return {
      type: 'object',
      description:
        'Фильтр по полям задачи в формате key-value (простой поиск). ' +
        '\n\n' +
        'Доступные поля для фильтрации:\n' +
        '- queue - ключ очереди\n' +
        '- status - статус задачи\n' +
        '- assignee - исполнитель (логин или ID)\n' +
        '- author - автор (логин или ID)\n' +
        '- priority - приоритет\n' +
        '- type - тип задачи\n' +
        '- resolution - резолюция\n' +
        '\n' +
        'Значения могут быть:\n' +
        '- Строки: { "queue": "PROJ", "status": "open" }\n' +
        '- Функции: "empty()", "notEmpty()"\n' +
        '\n' +
        'Примеры:\n' +
        '- { "queue": "PROJ", "assignee": "empty()" } - задачи без исполнителя в PROJ\n' +
        '- { "status": "open", "priority": "critical" } - открытые критичные\n' +
        '- { "author": "user@example.com", "resolution": "empty()" } - неразрешённые задачи автора\n' +
        '\n' +
        'ВАЖНО: Для сложных условий с OR/AND используй параметр query вместо filter.',
      additionalProperties: true,
    };
  }

  /**
   * Построить описание параметра keys
   */
  private buildKeysParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Список ключей задач для поиска (альтернатива query/filter). ' +
        '\n\n' +
        'ВАЖНО: Если нужно получить задачи по ключам, лучше используй fyt_mcp_get_issues ' +
        '(он оптимизирован для batch-получения). ' +
        '\n\n' +
        'Этот параметр полезен когда нужно:\n' +
        '- Найти задачи + применить expand параметры\n' +
        '- Комбинировать поиск по ключам с другими параметрами\n' +
        '\n' +
        'Формат: массив ключей в формате QUEUE-123',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123', 'PROJ-456'],
      }),
      {
        minItems: 1,
        examples: [['PROJ-123', 'PROJ-456']],
      }
    );
  }

  /**
   * Построить описание параметра queue
   */
  private buildQueueParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Ключ очереди для поиска всех задач в этой очереди. ' +
        '\n\n' +
        'Примеры:\n' +
        '- "PROJ" - все задачи в очереди PROJ\n' +
        '- "DEVOPS" - все задачи в очереди DEVOPS\n' +
        '\n' +
        'ВАЖНО: Можно комбинировать с фильтрацией полей и сортировкой. ' +
        'Используй perPage для ограничения количества результатов.',
      pattern: '^[A-Z][A-Z0-9]*$',
      examples: ['PROJ', 'DEVOPS', 'TEST'],
    };
  }

  /**
   * Построить описание параметра filterId
   */
  private buildFilterIdParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'ID сохранённого фильтра в Трекере. ' +
        '\n\n' +
        'Используй когда у пользователя есть готовые фильтры в интерфейсе Трекера.',
    };
  }

  /**
   * Построить описание параметра order
   */
  private buildOrderParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Сортировка результатов (работает только с filter, не с query). ' +
        '\n\n' +
        'Формат: ["±field1", "±field2"] где:\n' +
        '- "+" или отсутствие = возрастание (ASC)\n' +
        '- "-" = убывание (DESC)\n' +
        '\n' +
        'Примеры:\n' +
        '- ["+created"] - по дате создания (сначала старые)\n' +
        '- ["-priority", "+status"] - по приоритету (убыв.), потом по статусу (возр.)\n' +
        '- ["updated"] - по дате обновления (возрастание)\n' +
        '\n' +
        'Доступные поля: created, updated, priority, status, assignee',
      this.buildStringParam('Поле сортировки', {
        examples: ['+created', '-priority', 'updated'],
      }),
      {
        minItems: 1,
        examples: [['+created'], ['-priority', '+status']],
      }
    );
  }

  /**
   * Построить описание параметра perPage
   */
  private buildPerPageParam(): Record<string, unknown> {
    return {
      type: 'number',
      description:
        'Количество результатов на странице. ' +
        '\n\n' +
        'По умолчанию: 50\n' +
        'Рекомендуется: 10-50 для экономии токенов\n' +
        'Максимум: несколько сотен (зависит от сервера)\n' +
        '\n' +
        'ВАЖНО: Всегда фильтруй поля (fields параметр) для экономии токенов!',
      minimum: 1,
      examples: [10, 50, 100],
    };
  }

  /**
   * Построить описание параметра page
   */
  private buildPageParam(): Record<string, unknown> {
    return {
      type: 'number',
      description:
        'Номер страницы для пагинации (начинается с 1). ' +
        '\n\n' +
        'Используй вместе с perPage для получения больших списков задач.',
      minimum: 1,
      examples: [1, 2, 3],
    };
  }

  /**
   * Построить описание параметра expand
   */
  private buildExpandParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Расширение ответа дополнительными полями. ' +
        '\n\n' +
        'Доступные значения:\n' +
        '- "transitions" - доступные переходы по workflow\n' +
        '- "attachments" - вложения задачи\n' +
        '\n' +
        'Примеры:\n' +
        '- ["transitions"] - для получения доступных действий\n' +
        '- ["transitions", "attachments"] - полная информация',
      this.buildStringParam('Тип расширения', {
        examples: ['transitions', 'attachments'],
      }),
      {
        minItems: 1,
        examples: [['transitions'], ['transitions', 'attachments']],
      }
    );
  }

  /**
   * Построить описание параметра fields (переиспользуем логику из GetIssues)
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Список полей для возврата (опционально). ' +
        '\n\n' +
        'Если не указан - возвращаются ВСЕ доступные поля задачи. ' +
        'Рекомендуется ВСЕГДА указывать только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Основные поля: key, summary, description, status, priority, assignee, author, createdAt, updatedAt\n' +
        'Вложенные поля: assignee.login, status.key, queue.key\n' +
        '\n' +
        'Примеры:\n' +
        '- ["key", "summary", "status"] - минимальный набор\n' +
        '- ["key", "summary", "assignee.login", "status.key"] - с вложенными полями\n' +
        '\n' +
        'Экономия токенов: 80-90% при фильтрации 5-7 полей вместо всех',
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
