/**
 * MCP Tool для прямого (raw) обращения к API Яндекс.Трекера
 *
 * Escape hatch: позволяет дёрнуть GET-метод API, у которого ещё нет
 * типизированного инструмента. Не заменяет специализированные tools —
 * это fallback для новых/редких методов.
 *
 * Ответственность (SRP):
 * - Валидация параметров через Zod
 * - Делегирование запроса в Facade
 * - Фильтрация ответа по fields (экономия контекста)
 * - Форматирование результата
 *
 * ВАЖНО про fields: фильтрация применяется только к объектам и массивам
 * объектов. Если метод API вернёт скаляр или массив примитивов, fields
 * фактически игнорируется и ответ возвращается целиком.
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { RawApiRequestInput } from '#tracker_api/dto/index.js';
import { RawApiRequestParamsSchema } from './raw-api-request.schema.js';
import { RAW_API_REQUEST_TOOL_METADATA } from './raw-api-request.metadata.js';

/**
 * Инструмент прямого raw-запроса к API (read-only, только GET)
 */
export class RawApiRequestTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = RAW_API_REQUEST_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   */
  protected override getParamsSchema(): typeof RawApiRequestParamsSchema {
    return RawApiRequestParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров
    const validation = this.validateParams(params, RawApiRequestParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { method, path, query, fields } = validation.data;

    try {
      this.logger.info('Raw API запрос', { method, path });

      // 2. Делегирование в Facade (метод/путь/query)
      // query добавляем только если задан (exactOptionalPropertyTypes)
      const input: RawApiRequestInput = query ? { method, path, query } : { method, path };
      const data = await this.facade.rawApiRequest(input);

      // 3. Фильтрация ответа по fields (best-effort: примитивы вернутся как есть)
      const filtered = ResponseFieldFilter.filter(data, fields);

      // 4. Форматирование результата
      return this.formatSuccess({
        method,
        path,
        data: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка raw API запроса (${method} ${path})`, error);
    }
  }
}
