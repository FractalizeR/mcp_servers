/**
 * Определение MCP tool для поиска задач
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';

import { FIND_ISSUES_TOOL_METADATA } from './find-issues.metadata.js';
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
    return FIND_ISSUES_TOOL_METADATA;
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
        // fields и perPage обязательны; хотя бы один параметр поиска должен быть указан (валидация в schema)
        required: ['fields', 'perPage'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Ищет задачи по query (язык запросов Трекера), filter (key-value), keys, queue или filterId. ' +
      'Параметры fields* и perPage* обязательны для экономии токенов. Поддержка пагинации (perPage, page). ' +
      'Для получения конкретных задач: get_issues (эффективнее).'
    );
  }

  /**
   * Построить описание параметра query
   */
  private buildQueryParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Язык запросов Трекера. Формат: "Field: value" с пробелом между условиями (AND). ' +
        '\n' +
        'Операторы: OR, !, >, <, >=, <=, #(точное совпадение). ' +
        '\n' +
        'Функции: me(), empty(), notEmpty(), today(), now(), week(), month(), unresolved(). ' +
        '\n' +
        'Интервалы: "2024-01-01".."2024-12-31". Множество: author: "user1","user2". ' +
        '\n' +
        'История изменений: changed(from: "old" to: "new" by: "user" date: ">2024-01-01"). ' +
        '\n' +
        'Примеры: "Author: me() Resolution: empty()" | "Assignee: me() Deadline: week()" | ' +
        '"(Followers: me() OR Assignee: me()) Status: open" | "Priority: critical Status: open" | ' +
        '"Created: >2024-01-01 Queue: PROJ" | "Status: changed(to: \\"В работе\\" date: >today()-1w)" | ' +
        '"Created: \\"2024-01-01\\"..\\"2024-12-31\\" author: \\"user1\\",\\"user2\\""',
    };
  }

  /**
   * Построить описание параметра filter
   */
  private buildFilterParam(): Record<string, unknown> {
    return {
      type: 'object',
      description:
        'Фильтр key-value (простой поиск). Поля: queue, status, assignee, author, priority, type, resolution. ' +
        'Значения: строки или функции empty(), notEmpty(). ' +
        'Для сложных условий с OR/AND используй query.',
      additionalProperties: true,
    };
  }

  /**
   * Построить описание параметра keys
   */
  private buildKeysParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Список ключей задач (альтернатива query/filter). ' +
        'Для простого получения по ключам лучше get_issues (batch-оптимизирован).',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123'],
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
        'Ключ очереди для поиска всех задач. Комбинируй с fields и perPage для ограничения результатов.',
      pattern: '^[A-Z][A-Z0-9]*$',
      examples: ['PROJ'],
    };
  }

  /**
   * Построить описание параметра filterId
   */
  private buildFilterIdParam(): Record<string, unknown> {
    return {
      type: 'string',
      description: 'ID сохранённого фильтра в интерфейсе Трекера.',
    };
  }

  /**
   * Построить описание параметра order
   */
  private buildOrderParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Сортировка (только с filter). Формат: ["+field"] (ASC) или ["-field"] (DESC). ' +
        'Поля: created, updated, priority, status, assignee.',
      this.buildStringParam('Поле сортировки', {
        examples: ['+created'],
      }),
      {
        minItems: 1,
        examples: [['+created']],
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
        '⚠️ ОБЯЗАТЕЛЬНЫЙ. Количество результатов на странице. Запрашивайте минимально необходимое количество для экономии токенов.',
      minimum: 1,
      examples: [10, 20],
    };
  }

  /**
   * Построить описание параметра page
   */
  private buildPageParam(): Record<string, unknown> {
    return {
      type: 'number',
      description: 'Номер страницы для пагинации (начинается с 1). Используй с perPage.',
      minimum: 1,
      examples: [1],
    };
  }

  /**
   * Построить описание параметра expand
   */
  private buildExpandParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Расширение ответа: "transitions" (доступные переходы workflow), "attachments" (вложения задачи).',
      this.buildStringParam('Тип расширения', {
        examples: ['transitions'],
      }),
      {
        minItems: 1,
        examples: [['transitions']],
      }
    );
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Фильтр полей ответа (опционально, по умолчанию все). Указывайте только нужные поля для экономии токенов. ' +
        'Основные: key, summary, description, status, priority, assignee, author, createdAt, updatedAt. ' +
        'Вложенные (dot-notation): assignee.login, status.key, queue.key.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key'],
      }),
      {
        minItems: 1,
        examples: [['key', 'summary', 'status', 'assignee.login']],
      }
    );
  }
}
