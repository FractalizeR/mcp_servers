/**
 * Unit тесты для UpdateQueueTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateQueueTool } from '#tools/api/queues/update-queue.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createQueueFixture } from '#helpers/queue.fixture.js';

describe('UpdateQueueTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateQueueTool;

  beforeEach(() => {
    mockTrackerFacade = {
      updateQueue: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new UpdateQueueTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('update_queue', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Обновить параметры очереди');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('queueId');
      expect(definition.inputSchema.properties?.['queueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['name']).toBeDefined();
      expect(definition.inputSchema.properties?.['lead']).toBeDefined();
      expect(definition.inputSchema.properties?.['defaultType']).toBeDefined();
      expect(definition.inputSchema.properties?.['defaultPriority']).toBeDefined();
      expect(definition.inputSchema.properties?.['description']).toBeDefined();
      expect(definition.inputSchema.properties?.['issueTypes']).toBeDefined();
    });

    it('должен включать параметр fields в inputSchema', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
      expect(definition.inputSchema.required).toContain('fields');
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если queueId не указан', async () => {
        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого queueId', async () => {
        const result = await tool.execute({ queueId: '', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать только queueId без обновлений', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST' });
        vi.mocked(mockTrackerFacade.updateQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({ queueId: 'TEST', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          updates: {},
        });
      });
    });

    describe('обновление очереди', () => {
      it('должен обновить только name', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST', name: 'Updated Queue' });
        vi.mocked(mockTrackerFacade.updateQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'Updated Queue',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          updates: {
            name: 'Updated Queue',
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление очереди', {
          queueId: 'TEST',
          fieldsToUpdate: ['name'],
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Очередь успешно обновлена', {
          queueKey: 'TEST',
          queueName: 'Updated Queue',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            queueKey: string;
            queue: {
              name: string;
            };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.queueKey).toBe('TEST');
        expect(parsed.data.queue.name).toBe('Updated Queue');
      });

      it('должен обновить только description', async () => {
        const mockQueue = createQueueFixture({
          key: 'TEST',
          description: 'New description',
        });
        vi.mocked(mockTrackerFacade.updateQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'TEST',
          description: 'New description',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          updates: {
            description: 'New description',
          },
        });
      });

      it('должен обновить только lead', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST' });
        vi.mocked(mockTrackerFacade.updateQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'TEST',
          lead: 'newuser',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          updates: {
            lead: 'newuser',
          },
        });
      });

      it('должен обновить defaultType и defaultPriority', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST' });
        vi.mocked(mockTrackerFacade.updateQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'TEST',
          defaultType: '2',
          defaultPriority: '3',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          updates: {
            defaultType: '2',
            defaultPriority: '3',
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление очереди', {
          queueId: 'TEST',
          fieldsToUpdate: ['defaultType', 'defaultPriority'],
        });
      });

      it('должен обновить issueTypes', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST' });
        vi.mocked(mockTrackerFacade.updateQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'TEST',
          issueTypes: ['1', '2', '3'],
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          updates: {
            issueTypes: ['1', '2', '3'],
          },
        });
      });

      it('должен обновить несколько полей одновременно', async () => {
        const mockQueue = createQueueFixture({
          key: 'PROJ',
          name: 'Updated Project',
          description: 'Updated description',
        });
        vi.mocked(mockTrackerFacade.updateQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'PROJ',
          name: 'Updated Project',
          description: 'Updated description',
          lead: 'admin',
          defaultType: '3',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateQueue).toHaveBeenCalledWith({
          queueId: 'PROJ',
          updates: {
            name: 'Updated Project',
            description: 'Updated description',
            lead: 'admin',
            defaultType: '3',
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление очереди', {
          queueId: 'PROJ',
          fieldsToUpdate: expect.arrayContaining(['name', 'description', 'lead', 'defaultType']),
        });
      });

      it('должен обновить все возможные поля', async () => {
        const mockQueue = createQueueFixture({ key: 'FULL' });
        vi.mocked(mockTrackerFacade.updateQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'FULL',
          name: 'Full Update',
          description: 'Full description',
          lead: 'newlead',
          defaultType: '2',
          defaultPriority: '3',
          issueTypes: ['1', '2', '3', '4'],
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateQueue).toHaveBeenCalledWith({
          queueId: 'FULL',
          updates: {
            name: 'Full Update',
            description: 'Full description',
            lead: 'newlead',
            defaultType: '2',
            defaultPriority: '3',
            issueTypes: ['1', '2', '3', '4'],
          },
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "очередь не найдена"', async () => {
        const error = new Error('Queue not found');
        vi.mocked(mockTrackerFacade.updateQueue).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'NOTEXIST',
          name: 'New Name',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при обновлении очереди NOTEXIST');
        expect(parsed.error).toBe('Queue not found');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.updateQueue).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'New Name',
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
        vi.mocked(mockTrackerFacade.updateQueue).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          lead: 'invalid-user',
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

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.updateQueue).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          description: 'New description',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Network timeout');
      });
    });
  });
});
