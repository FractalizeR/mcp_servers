/**
 * PingTool - Проверка подключения к TickTick API
 *
 * Простая проверка работоспособности API.
 * Возвращает latency, статус и количество проектов.
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { PingParamsSchema, PING_OUTPUT_SCHEMA } from './ping.schema.js';
import { PING_TOOL_METADATA } from './ping.metadata.js';

export class PingTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = PING_TOOL_METADATA;

  protected override getParamsSchema(): typeof PingParamsSchema {
    return PingParamsSchema;
  }

  /**
   * Extend auto-generated definition with title/outputSchema/annotations
   * (пакет 3.1.C.ticktick).
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Ping',
      outputSchema: PING_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    };
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
