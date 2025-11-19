/**
 * Определение DemoTool для MCP
 *
 * ФИКТИВНЫЙ TOOL для демонстрации удобства масштабирования
 */

import type { ToolDefinition, StaticToolMetadata } from '@mcp-framework/core';
import { BaseToolDefinition } from '@mcp-framework/core';
import { DEMO_TOOL_METADATA } from './demo.metadata.js';

export class DemoDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DEMO_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(
        'Демонстрационный инструмент для проверки масштабируемости архитектуры'
      ),
      inputSchema: {
        type: 'object',
        properties: {
          message: this.buildStringParam('Сообщение для демонстрации'),
        },
        required: ['message'],
      },
    };
  }
}
