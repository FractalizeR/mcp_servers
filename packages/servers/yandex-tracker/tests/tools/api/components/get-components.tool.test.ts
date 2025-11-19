/**
 * Unit тесты для GetComponentsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetComponentsTool } from '@tools/api/components/get-components.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createComponentFixture } from '../../../helpers/component.fixture.js';

describe('GetComponentsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetComponentsTool;

  beforeEach(() => {
    mockTrackerFacade = {
      getComponents: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetComponentsTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_components', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('список компонентов');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('queueId');
      expect(definition.inputSchema.required).toContain('fields');
      expect(definition.inputSchema.properties?.['queueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если queueId не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого queueId', async () => {
        const result = await tool.execute({ queueId: '', fields: ['id', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректный queueId', async () => {
        const mockComponents = [
          createComponentFixture({ id: '1', name: 'Component 1' }),
          createComponentFixture({ id: '2', name: 'Component 2' }),
        ];
        vi.mocked(mockTrackerFacade.getComponents).mockResolvedValue(mockComponents);

        const result = await tool.execute({ queueId: 'TEST', fields: ['id', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getComponents).toHaveBeenCalledWith({
          queueId: 'TEST',
        });
      });
    });

    describe('получение списка компонентов', () => {
      it('должен получить список компонентов по queueId', async () => {
        const mockComponents = [
          createComponentFixture({ id: '1', name: 'Component 1' }),
          createComponentFixture({ id: '2', name: 'Component 2' }),
          createComponentFixture({ id: '3', name: 'Component 3' }),
        ];
        vi.mocked(mockTrackerFacade.getComponents).mockResolvedValue(mockComponents);

        const result = await tool.execute({ queueId: 'MYQUEUE', fields: ['id', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getComponents).toHaveBeenCalledWith({
          queueId: 'MYQUEUE',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Получение списка компонентов очереди', {
          queueId: 'MYQUEUE',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Список компонентов получен', {
          count: 3,
          queueId: 'MYQUEUE',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            components: unknown[];
            count: number;
            queueId: string;
            fieldsReturned: string[];
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.components).toHaveLength(3);
        expect(parsed.data.count).toBe(3);
        expect(parsed.data.queueId).toBe('MYQUEUE');
        expect(parsed.data.fieldsReturned).toEqual(['id', 'name']);
      });

      it('должен обработать пустой список компонентов', async () => {
        vi.mocked(mockTrackerFacade.getComponents).mockResolvedValue([]);

        const result = await tool.execute({ queueId: 'EMPTY', fields: ['id', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('Список компонентов получен', {
          count: 0,
          queueId: 'EMPTY',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            components: unknown[];
            count: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.components).toHaveLength(0);
        expect(parsed.data.count).toBe(0);
      });

      it('должен получить компоненты с разными свойствами', async () => {
        const mockComponents = [
          createComponentFixture({
            id: '1',
            name: 'Backend',
            description: 'Backend services',
          }),
          createComponentFixture({
            id: '2',
            name: 'Frontend',
            assignAuto: true,
          }),
        ];
        vi.mocked(mockTrackerFacade.getComponents).mockResolvedValue(mockComponents);

        const result = await tool.execute({ queueId: 'PROJECT', fields: ['id', 'name'] });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            components: Array<{ name: string }>;
          };
        };
        expect(parsed.data.components).toHaveLength(2);
        expect(parsed.data.components[0]?.name).toBe('Backend');
        expect(parsed.data.components[1]?.name).toBe('Frontend');
      });

      it('должен получить один компонент', async () => {
        const mockComponents = [createComponentFixture({ id: '1', name: 'Single Component' })];
        vi.mocked(mockTrackerFacade.getComponents).mockResolvedValue(mockComponents);

        const result = await tool.execute({ queueId: 'SINGLE', fields: ['id', 'name'] });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            components: unknown[];
            count: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.count).toBe(1);
        expect(parsed.data.components).toHaveLength(1);
      });

      it('должен обработать большое количество компонентов', async () => {
        const mockComponents = Array.from({ length: 50 }, (_, i) =>
          createComponentFixture({ id: `${i + 1}`, name: `Component ${i + 1}` })
        );
        vi.mocked(mockTrackerFacade.getComponents).mockResolvedValue(mockComponents);

        const result = await tool.execute({ queueId: 'LARGE', fields: ['id', 'name'] });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            components: unknown[];
            count: number;
          };
        };
        expect(parsed.data.count).toBe(50);
        expect(parsed.data.components).toHaveLength(50);
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "очередь не найдена"', async () => {
        const error = new Error('Queue not found');
        vi.mocked(mockTrackerFacade.getComponents).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'NOTEXIST', fields: ['id', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении списка компонентов');
        expect(parsed.error).toBe('Queue not found');
      });

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.getComponents).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'TEST', fields: ['id', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Network timeout');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.getComponents).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'RESTRICTED', fields: ['id', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Permission denied');
      });

      it('должен обработать ошибку API', async () => {
        const error = new Error('API Error: 500 Internal Server Error');
        vi.mocked(mockTrackerFacade.getComponents).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'TEST', fields: ['id', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toContain('API Error');
      });
    });
  });
});
