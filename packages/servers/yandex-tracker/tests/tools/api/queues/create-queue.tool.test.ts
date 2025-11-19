/**
 * Unit тесты для CreateQueueTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateQueueTool } from '@tools/api/queues/create-queue.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { STANDARD_QUEUE_FIELDS } from '../../../helpers/test-fields.js';
import { createQueueFixture } from '../../../helpers/queue.fixture.js';

describe('CreateQueueTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateQueueTool;

  beforeEach(() => {
    mockTrackerFacade = {
      createQueue: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new CreateQueueTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('create_queue', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Создать новую очередь');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('key');
      expect(definition.inputSchema.required).toContain('name');
      expect(definition.inputSchema.required).toContain('lead');
      expect(definition.inputSchema.required).toContain('defaultType');
      expect(definition.inputSchema.required).toContain('defaultPriority');
      expect(definition.inputSchema.properties?.['key']).toBeDefined();
      expect(definition.inputSchema.properties?.['name']).toBeDefined();
      expect(definition.inputSchema.properties?.['description']).toBeDefined();
      expect(definition.inputSchema.properties?.['issueTypes']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если обязательные поля не указаны', async () => {
        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного key (lowercase)', async () => {
        const result = await tool.execute({
          key: 'test',
          name: 'Test Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного key (слишком короткий)', async () => {
        const result = await tool.execute({
          key: 'T',
          name: 'Test Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного key (слишком длинный)', async () => {
        const result = await tool.execute({
          key: 'VERYLONGKEY',
          name: 'Test Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного key (содержит цифры)', async () => {
        const result = await tool.execute({
          key: 'TEST123',
          name: 'Test Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректный key (2 символа)', async () => {
        const mockQueue = createQueueFixture({ key: 'MY' });
        vi.mocked(mockTrackerFacade.createQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          key: 'MY',
          name: 'My Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createQueue).toHaveBeenCalled();
      });

      it('должен принимать корректный key (10 символов)', async () => {
        const mockQueue = createQueueFixture({ key: 'MYQUEUEKEY' });
        vi.mocked(mockTrackerFacade.createQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          key: 'MYQUEUEKEY',
          name: 'My Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createQueue).toHaveBeenCalled();
      });

      it('должен вернуть ошибку если name пустой', async () => {
        const result = await tool.execute({
          key: 'TEST',
          name: '',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });
    });

    describe('создание очереди', () => {
      it('должен создать очередь с минимальными обязательными полями', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST', name: 'Test Queue' });
        vi.mocked(mockTrackerFacade.createQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          key: 'TEST',
          name: 'Test Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createQueue).toHaveBeenCalledWith({
          key: 'TEST',
          name: 'Test Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Создание новой очереди', {
          key: 'TEST',
          name: 'Test Queue',
          lead: 'user1',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Очередь успешно создана', {
          queueKey: 'TEST',
          queueName: 'Test Queue',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            queueKey: string;
            queue: {
              key: string;
              name: string;
            };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.queueKey).toBe('TEST');
        expect(parsed.data.queue.key).toBe('TEST');
      });

      it('должен создать очередь с описанием', async () => {
        const mockQueue = createQueueFixture({
          key: 'PROJ',
          name: 'Project Queue',
          description: 'Project description',
        });
        vi.mocked(mockTrackerFacade.createQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          key: 'PROJ',
          name: 'Project Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          description: 'Project description',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createQueue).toHaveBeenCalledWith({
          key: 'PROJ',
          name: 'Project Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          description: 'Project description',
        });
      });

      it('должен создать очередь с типами задач', async () => {
        const mockQueue = createQueueFixture({ key: 'TASK' });
        vi.mocked(mockTrackerFacade.createQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          key: 'TASK',
          name: 'Task Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          issueTypes: ['1', '2', '3'],
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createQueue).toHaveBeenCalledWith({
          key: 'TASK',
          name: 'Task Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          issueTypes: ['1', '2', '3'],
        });
      });

      it('должен создать очередь со всеми опциональными полями', async () => {
        const mockQueue = createQueueFixture({ key: 'FULL' });
        vi.mocked(mockTrackerFacade.createQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          key: 'FULL',
          name: 'Full Queue',
          lead: 'admin',
          defaultType: '1',
          defaultPriority: '3',
          description: 'Full queue description',
          issueTypes: ['1', '2', '3', '4'],
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createQueue).toHaveBeenCalledWith({
          key: 'FULL',
          name: 'Full Queue',
          lead: 'admin',
          defaultType: '1',
          defaultPriority: '3',
          description: 'Full queue description',
          issueTypes: ['1', '2', '3', '4'],
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "очередь уже существует"', async () => {
        const error = new Error('Queue already exists');
        vi.mocked(mockTrackerFacade.createQueue).mockRejectedValue(error);

        const result = await tool.execute({
          key: 'EXIST',
          name: 'Existing Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при создании очереди EXIST');
        expect(parsed.error).toBe('Queue already exists');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.createQueue).mockRejectedValue(error);

        const result = await tool.execute({
          key: 'TEST',
          name: 'Test Queue',
          lead: 'user1',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Permission denied');
      });

      it('должен обработать ошибку "некорректный lead"', async () => {
        const error = new Error('Invalid lead user');
        vi.mocked(mockTrackerFacade.createQueue).mockRejectedValue(error);

        const result = await tool.execute({
          key: 'TEST',
          name: 'Test Queue',
          lead: 'invalid-user',
          defaultType: '1',
          defaultPriority: '2',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Invalid lead user');
      });
    });
  });
});
