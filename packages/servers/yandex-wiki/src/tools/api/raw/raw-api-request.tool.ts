/**
 * MCP Tool для прямого (raw) обращения к API Яндекс.Вики.
 *
 * Escape hatch: позволяет дёрнуть GET-метод API, у которого ещё нет
 * типизированного инструмента. Не заменяет специализированные tools —
 * это fallback для новых/редких методов.
 *
 * Общий execute() (валидация → facade.rawApiRequest → ResponseFieldFilter →
 * format) реализован в BaseRawApiRequestTool из @fractalizer/mcp-core.
 * Этот класс задаёт только METADATA и схему параметров.
 */

import { BaseRawApiRequestTool } from '@fractalizer/mcp-core';
import type { z } from 'zod';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import { RawApiRequestParamsSchema } from './raw-api-request.schema.js';
import { RAW_API_REQUEST_TOOL_METADATA } from './raw-api-request.metadata.js';
/**
 * Инструмент прямого raw-запроса к API Вики (read-only, только GET).
 */
export class RawApiRequestTool extends BaseRawApiRequestTool<YandexWikiFacade> {
  /**
   * Статические метаданные для compile-time индексации.
   */
  static override readonly METADATA = RAW_API_REQUEST_TOOL_METADATA;

  /**
   * Схема параметров (источник истины для автогенерации definition).
   */
  protected override getParamsSchema(): z.ZodObject<z.ZodRawShape> {
    return RawApiRequestParamsSchema;
  }
}
