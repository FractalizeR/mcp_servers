/**
 * PingTool - Проверка подключения к TickTick API
 *
 * Простая проверка работоспособности API.
 * Возвращает latency, статус и количество проектов.
 */

import { BaseTool } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { PingParamsSchema } from './ping.schema.js';
import { PING_TOOL_METADATA } from './ping.metadata.js';

export class PingTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = PING_TOOL_METADATA;

  protected override getParamsSchema(): typeof PingParamsSchema {
    return PingParamsSchema;
  }

  async execute(_params: ToolCallParams): Promise<ToolResult> {
    try {
      const startTime = Date.now();
      const projects = await this.facade.getProjects();
      const latency = Date.now() - startTime;

      return this.formatSuccess({
        status: 'connected',
        latencyMs: latency,
        projectCount: projects.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return this.formatSuccess({
        status: 'disconnected',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
