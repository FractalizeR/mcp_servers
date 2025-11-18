/**
 * MCP Tool для создания очереди в Яндекс.Трекере
 *
 * ВАЖНО: Создание очередей - администраторская операция!
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { CreateQueueDefinition } from './create-queue.definition.js';
import { CreateQueueParamsSchema } from './create-queue.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';
import type { CreateQueueDto } from '@tracker_api/dto/index.js';

export class CreateQueueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: buildToolName('create_queue', MCP_TOOL_PREFIX),
    description: '[Queues/Write] Создать новую очередь',
    category: ToolCategory.QUEUES,
    subcategory: 'write',
    priority: ToolPriority.CRITICAL,
    tags: ['queue', 'create', 'write'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

  private readonly definition = new CreateQueueDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateQueueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { key, name, lead, defaultType, defaultPriority, description, issueTypes } =
      validation.data;

    try {
      this.logger.info('Создание новой очереди', {
        key,
        name,
        lead,
      });

      const queueData: CreateQueueDto = {
        key,
        name,
        lead,
        defaultType,
        defaultPriority,
        ...(description && { description }),
        ...(issueTypes && { issueTypes }),
      };

      const createdQueue = await this.facade.createQueue(queueData);

      this.logger.info('Очередь успешно создана', {
        queueKey: createdQueue.key,
        queueName: createdQueue.name,
      });

      return this.formatSuccess({
        queueKey: createdQueue.key,
        queue: createdQueue,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании очереди ${key}`, error as Error);
    }
  }
}
