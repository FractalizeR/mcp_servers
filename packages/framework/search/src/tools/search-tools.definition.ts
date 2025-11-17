/**
 * Определение SearchToolsTool для MCP
 *
 * Responsibilities:
 * - Описание inputSchema для поиска tools
 * - Документация параметров
 * - Примеры использования
 */

import type { ToolDefinition, StaticToolMetadata } from '@mcp-framework/core';
import { BaseToolDefinition } from '@mcp-framework/core';
import { buildToolName } from '@mcp-framework/core';
import { SearchToolsTool } from './search-tools.tool.js';

/**
 * Definition builder для SearchToolsTool
 */
export class SearchToolsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return SearchToolsTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: buildToolName('search_tools'),
      description: this.wrapWithSafetyWarning(
        '⚠️ PRIMARY способ обнаружения инструментов в этом MCP сервере.\n\n' +
          'tools/list возвращает только essential инструменты (ping, search_tools). ' +
          'Используйте search_tools для поиска нужных операций перед их вызовом.\n\n' +
          'Поддерживает:\n' +
          '• Поиск по названию, описанию, категории, тегам\n' +
          '• Фильтрацию по категории (issues, users, projects, etc.)\n' +
          '• Фильтрацию по типу (helper vs API операции)\n' +
          '• 3 уровня детализации результатов\n\n' +
          'Примеры:\n' +
          '• "найти инструменты для работы с задачами"\n' +
          '• "получить URL задачи"\n' +
          '• "создать задачу"'
      ),
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
