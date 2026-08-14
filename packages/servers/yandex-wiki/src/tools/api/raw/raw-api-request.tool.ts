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
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import {
  RawApiRequestParamsSchema,
  RawApiRequestOutputDataSchema,
} from './raw-api-request.schema.js';
import { RAW_API_REQUEST_TOOL_METADATA } from './raw-api-request.metadata.js';
import { withDefinitionExtras, buildOutputSchema } from '../../shared/tool-definition-extras.js';

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

  /**
   * `getDefinition()` наследуется из BaseTool (через BaseRawApiRequestTool) —
   * оба во framework, вне границ этого пакета. Наложение
   * title/outputSchema/annotations делается здесь же переопределением, как и
   * для остальных 21 tool сервера.
   */
  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Прямой запрос к API Вики (raw)',
      outputSchema: buildOutputSchema(RawApiRequestOutputDataSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    });
  }
}
