/**
 * Абстрактный базовый класс для raw-API-passthrough инструментов.
 *
 * Инкапсулирует общий execute(): валидация → делегирование в фасад → фильтрация
 * ответа по fields → форматирование. Подкласс задаёт только METADATA и схему
 * (через createRawApiRequestSchema с server-specific path-паттерном).
 *
 * ВАЖНО про fields: фильтрация применяется только к объектам и массивам объектов.
 * Если метод API вернёт скаляр или массив примитивов, fields фактически
 * игнорируется и ответ возвращается целиком.
 */

import type { z, ZodSchema } from 'zod';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { BaseTool } from '../base/base-tool.js';
import { ResponseFieldFilter } from '../../utils/index.js';
import type {
  RawApiCapable,
  RawApiMethod,
  RawApiQueryParams,
  RawApiRequestInput,
} from './raw-api.types.js';

/**
 * Форма провалидированных параметров raw-запроса.
 */
interface RawApiValidatedParams {
  method: RawApiMethod;
  path: string;
  query?: RawApiQueryParams;
  fields: string[];
}

/**
 * Базовый tool для raw-запроса (read-only, только GET).
 *
 * @typeParam TFacade - фасад сервера, реализующий RawApiCapable
 */
export abstract class BaseRawApiRequestTool<
  TFacade extends RawApiCapable,
> extends BaseTool<TFacade> {
  /**
   * Схема параметров (подкласс возвращает результат createRawApiRequestSchema).
   */
  protected abstract override getParamsSchema(): z.ZodObject<z.ZodRawShape>;

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const schema = this.getParamsSchema() as unknown as ZodSchema<RawApiValidatedParams>;

    const validation = this.validateParams(params, schema);
    if (!validation.success) {
      return validation.error;
    }

    const { method, path, query, fields } = validation.data;

    try {
      this.logger.info('Raw API запрос', { method, path });

      // query опускаем, если не задан (exactOptionalPropertyTypes)
      const input: RawApiRequestInput = query ? { method, path, query } : { method, path };
      const data = await this.facade.rawApiRequest(input);

      const filtered = ResponseFieldFilter.filter(data, fields);

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
