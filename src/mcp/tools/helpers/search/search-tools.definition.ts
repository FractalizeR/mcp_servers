/**
 * Определение SearchToolsTool для MCP
 *
 * Responsibilities:
 * - Описание inputSchema для поиска tools
 * - Документация параметров
 * - Примеры использования
 */

import type { ToolDefinition } from '@mcp/tools/base/index.js';

import { buildToolName } from '@mcp/tools/common/utils/index.js';
/**
 * Definition builder для SearchToolsTool
 */
export class SearchToolsDefinition {
  build(): ToolDefinition {
    return {
      name: buildToolName('search_tools'),
      description:
        'Поиск доступных MCP инструментов по запросу. ' +
        'Поддерживает поиск по названию, описанию, категориям и тегам. ' +
        'Используйте для обнаружения нужных инструментов перед их вызовом. ' +
        'Примеры: "найти инструменты для работы с задачами", "ping", "получить URL".',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Поисковый запрос (название, описание, категория или тег). ' +
              'Примеры: "issue", "задачи", "ping", "url"',
          },
          detailLevel: {
            type: 'string',
            enum: ['name_only', 'name_and_description', 'full'],
            description:
              'Уровень детализации результатов:\n' +
              '- name_only: только названия инструментов (минимум токенов)\n' +
              '- name_and_description: названия + описания + категории (по умолчанию)\n' +
              '- full: полные метаданные с inputSchema и примерами',
          },
          category: {
            type: 'string',
            enum: [
              'issues',
              'users',
              'projects',
              'boards',
              'sprints',
              'comments',
              'search',
              'url-generation',
              'validation',
              'demo',
            ],
            description:
              'Фильтр по категории инструментов. ' +
              'API категории: issues, users, projects, boards, sprints, comments. ' +
              'Helper категории: search, url-generation, validation, demo.',
          },
          isHelper: {
            type: 'boolean',
            description:
              'Фильтр по типу инструмента:\n' +
              '- true: только helper инструменты (поиск, генерация URL, валидация)\n' +
              '- false: только API операции (работа с задачами, пользователями)\n' +
              '- не указан: все инструменты',
          },
          limit: {
            type: 'number',
            description: 'Максимальное количество результатов (по умолчанию: 10)',
          },
        },
        required: ['query'],
      },
    };
  }
}
