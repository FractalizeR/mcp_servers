/**
 * DemoTool - Демонстрационный инструмент
 *
 * ФИКТИВНЫЙ TOOL для демонстрации удобства масштабирования
 *
 * Показывает, что для добавления нового tool нужно:
 * 1. Создать структуру файлов (schema, definition, tool)
 * 2. Добавить класс в composition-root/definitions/tool-definitions.ts
 * 3. Всё остальное происходит АВТОМАТИЧЕСКИ
 */

import { BaseTool, ToolCategory } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DemoDefinition } from './demo.definition.js';
import { DemoParamsSchema } from './demo.schema.js';

import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

export class DemoTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('demo', MCP_TOOL_PREFIX),
    description: 'Демонстрационный инструмент для тестирования',
    category: ToolCategory.DEMO,
    tags: ['demo', 'example', 'test'],
    isHelper: true,
  } as const;

  private readonly definition = new DemoDefinition();

  getDefinition(): ReturnType<DemoDefinition['build']> {
    return this.definition.build();
  }

  execute(params: ToolCallParams): Promise<ToolResult> {
    // Валидация параметров через BaseTool
    const validation = this.validateParams(params, DemoParamsSchema);
    if (!validation.success) return Promise.resolve(validation.error);

    const { message } = validation.data;

    try {
      this.logger.info('DemoTool вызван', { message });

      // Простая демонстрация работы
      const result = {
        status: 'success',
        message: `Демонстрационный ответ: ${message}`,
        timestamp: new Date().toISOString(),
        info: 'Этот tool добавлен для демонстрации масштабируемости',
      };

      return Promise.resolve(this.formatSuccess(result));
    } catch (error: unknown) {
      return Promise.resolve(this.formatError('Ошибка выполнения DemoTool', error as Error));
    }
  }
}
