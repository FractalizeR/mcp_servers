/**
 * Инструмент для проверки подключения к API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - Проверка доступности API
 * - Валидация OAuth токена
 * - Получение информации о текущем пользователе
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { PingParamsSchema, PingOutputSchema } from './ping.schema.js';
import { PING_TOOL_METADATA } from './ping.metadata.js';

/**
 * Ping инструмент для диагностики подключения
 */
export class PingTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = PING_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof PingParamsSchema {
    return PingParamsSchema;
  }

  /**
   * Ping реально обращается к API Трекера (facade.ping()) — openWorldHint: true.
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Проверка доступности сервера',
      outputSchema: PingOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
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
