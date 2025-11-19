/**
 * Определение MCP tool для проверки подключения
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { PING_TOOL_METADATA } from './ping.metadata.js';

/**
 * Definition для PingTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент (проверка доступности API)
 * - Какие параметры принимает (нет параметров)
 * - Формат ответа
 */
export class PingDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return PING_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
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
}
