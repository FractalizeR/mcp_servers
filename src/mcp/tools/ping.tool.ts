/**
 * Инструмент для проверки подключения к API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - Проверка доступности API
 * - Валидация OAuth токена
 * - Получение информации о текущем пользователе
 */

import { BaseTool, ToolCategory } from '@mcp/tools/base/index.js';
import type { ToolDefinition } from '@mcp/tools/base/index.js';
import type { ToolCallParams, ToolResult } from '@types';

import { buildToolName } from '@mcp/tools/common/utils/index.js';
/**
 * Ping инструмент для диагностики подключения
 */
export class PingTool extends BaseTool {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('ping'),
    description:
      'Проверка доступности API Яндекс.Трекера и валидности OAuth токена. Возвращает информацию о текущем пользователе. Не требует параметров.',
    category: ToolCategory.USERS,
    tags: ['ping', 'health', 'check', 'connection', 'diagnostics'],
    isHelper: false,
  } as const;

  /**
   * Определение инструмента для MCP
   */
  override getDefinition(): ToolDefinition {
    return {
      name: buildToolName('ping'),
      description:
        'Проверка доступности API Яндекс.Трекера и валидности OAuth токена. ' +
        'Возвращает информацию о текущем пользователе. ' +
        'Не требует параметров.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  /**
   * Выполнение проверки подключения
   */
  async execute(_params: ToolCallParams): Promise<ToolResult> {
    try {
      this.logger.info('Проверка подключения к API Яндекс.Трекера...');

      // Используем Facade для проверки подключения (API v3)
      const response = await this.trackerFacade.ping();

      this.logger.info('Подключение успешно установлено');

      return this.formatSuccess({
        message: response.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return this.formatError('Ошибка при проверке подключения к API Яндекс.Трекера', error);
    }
  }
}
