/**
 * Инструмент для проверки подключения к API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - Проверка доступности API
 * - Валидация OAuth токена
 * - Получение информации о текущем пользователе
 */

import { BaseTool, ToolCategory, ToolPriority, buildToolName } from '@mcp-framework/core';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import { MCP_TOOL_PREFIX } from '../constants.js';
import { PingDefinition } from './ping.definition.js';

/**
 * Ping инструмент для диагностики подключения
 */
export class PingTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('ping', MCP_TOOL_PREFIX),
    description: '[System/Health] Проверка доступности сервера',
    category: ToolCategory.SYSTEM,
    subcategory: 'health',
    priority: ToolPriority.NORMAL,
    tags: ['ping', 'health', 'status'],
    isHelper: false,
  } as const;

  private readonly definition = new PingDefinition();

  /**
   * Определение инструмента для MCP
   */
  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  /**
   * Выполнение проверки подключения
   */
  async execute(_params: ToolCallParams): Promise<ToolResult> {
    try {
      this.logger.info('Проверка подключения к API Яндекс.Трекера...');

      // Используем Facade для проверки подключения (API v3)
      const response = await this.facade.ping();

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
