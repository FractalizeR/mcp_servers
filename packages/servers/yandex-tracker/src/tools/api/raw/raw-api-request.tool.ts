/**
 * MCP Tool для прямого (raw) обращения к API Яндекс.Трекера
 *
 * Escape hatch: позволяет дёрнуть GET-метод API, у которого ещё нет
 * типизированного инструмента. Не заменяет специализированные tools —
 * это fallback для новых/редких методов.
 *
 * Логика execute() (validate → facade.rawApiRequest → ResponseFieldFilter →
 * formatSuccess) наследуется из BaseRawApiRequestTool (@fractalizer/mcp-core).
 * Подкласс задаёт только METADATA (префикс tracker) и схему (path-паттерн
 * tracker + локальная FieldsSchema).
 *
 * ВАЖНО про fields: фильтрация применяется только к объектам и массивам
 * объектов. Если метод API вернёт скаляр или массив примитивов, fields
 * фактически игнорируется и ответ возвращается целиком.
 */

import { BaseRawApiRequestTool } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { RawApiRequestParamsSchema, RawApiRequestOutputSchema } from './raw-api-request.schema.js';
import { RAW_API_REQUEST_TOOL_METADATA } from './raw-api-request.metadata.js';

/**
 * Инструмент прямого raw-запроса к API (read-only, только GET)
 */
export class RawApiRequestTool extends BaseRawApiRequestTool<YandexTrackerFacade> {
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

  /**
   * GET-only escape hatch: read-only, идемпотентен (GET без побочных
   * эффектов), обращается во внешний API Трекера.
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Прямой запрос к API (GET)',
      outputSchema: RawApiRequestOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    };
  }
}
