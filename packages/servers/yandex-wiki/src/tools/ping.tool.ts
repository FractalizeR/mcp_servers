import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { PingParamsSchema } from './ping.schema.js';
import { PING_TOOL_METADATA } from './ping.metadata.js';

export class PingTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = PING_TOOL_METADATA;

  protected override getParamsSchema(): typeof PingParamsSchema {
    return PingParamsSchema;
  }

  async execute(_params: ToolCallParams): Promise<ToolResult> {
    try {
      ResultLogger.logOperationStart(this.logger, 'Ping Wiki API', 1);

      const startTime = Date.now();

      // Попытка получить корневую страницу для проверки подключения
      await this.facade.getPage({ slug: 'homepage' });

      const responseTime = Date.now() - startTime;

      return this.formatSuccess({
        status: 'ok',
        message: 'Подключение к Yandex Wiki API работает',
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      // Даже если страница не найдена, соединение работает
      const isNotFound =
        error instanceof Error &&
        (error.message.includes('404') || error.message.includes('not found'));

      if (isNotFound) {
        return this.formatSuccess({
          status: 'ok',
          message: 'Подключение к Yandex Wiki API работает (homepage не найден, но API отвечает)',
          timestamp: new Date().toISOString(),
        });
      }

      return this.formatError('Ошибка подключения к Yandex Wiki API', error);
    }
  }
}
