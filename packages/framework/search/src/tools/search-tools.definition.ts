/**
 * Определение SearchToolsTool для MCP
 *
 * Responsibilities:
 * - Описание inputSchema для поиска tools
 * - Документация параметров
 * - Примеры использования
 */

import type { ToolDefinition, StaticToolMetadata } from '@fractalizer/mcp-core';
import { BaseToolDefinition } from '@fractalizer/mcp-core';
import { buildToolName } from '@fractalizer/mcp-core';
import { SEARCH_TOOLS_METADATA } from './search-tools.metadata.js';

/**
 * Definition builder для SearchToolsTool
 */
export class SearchToolsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return SEARCH_TOOLS_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: buildToolName('search_tools'),
      description: this.wrapWithSafetyWarning(
        '⚠️ PRIMARY способ обнаружения инструментов в этом MCP сервере.\n\n' +
          'tools/list возвращает только essential инструменты (ping, search_tools). ' +
          'Используйте search_tools для поиска нужных операций перед их вызовом.\n\n' +
          '⚠️ ВАЖНО: Указывайте query для фильтрации по задаче, чтобы не забивать контекст.\n' +
          'Получение ВСЕХ инструментов (без query) возвращает много данных — используйте только при необходимости!\n\n' +
          'Поддерживает:\n' +
          '• Поиск по названию, описанию, категории, тегам (query указан) — РЕКОМЕНДУЕТСЯ\n' +
          '• Получение списка ВСЕХ инструментов (query не указан) — используйте редко\n' +
          '• Фильтрацию по категории (issues, users, projects, etc.)\n' +
          '• Фильтрацию по типу (helper vs API операции)\n' +
          '• 3 уровня детализации результатов\n\n' +
          'Примеры использования:\n' +
          '• {query: "задачи"} - найти инструменты для работы с задачами (ЛУЧШИЙ подход)\n' +
          '• {query: "issue"} - найти инструменты для работы с issues\n' +
          '• {query: "создать"} - найти инструменты создания\n' +
          '• {category: "issues"} - только инструменты категории issues\n' +
          '• {} - получить список ВСЕХ инструментов (осторожно: много данных!)\n' +
          '• {query: "*"} - получить список ВСЕХ инструментов (осторожно: много данных!)'
      ),
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              '(Опционально) Поисковый запрос для фильтрации инструментов.\n' +
              'Если не указан или пустая строка - возвращаются ВСЕ инструменты.\n' +
              'Поиск выполняется по названию, описанию, категории, тегам.\n' +
              'Примеры: "issue", "задачи", "создать", "create", "ping", "url"',
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
        required: [],
      },
    };
  }
}
