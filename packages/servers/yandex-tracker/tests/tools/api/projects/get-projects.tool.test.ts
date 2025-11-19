/**
 * Unit тесты для GetProjectsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetProjectsTool } from '@tools/api/projects/get-projects.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createProjectListFixture } from '../../../helpers/project.fixture.js';

describe('GetProjectsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetProjectsTool;

  beforeEach(() => {
    mockTrackerFacade = {
      getProjects: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetProjectsTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_projects', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Получить список всех проектов');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties?.['perPage']).toBeDefined();
      expect(definition.inputSchema.properties?.['page']).toBeDefined();
      expect(definition.inputSchema.properties?.['expand']).toBeDefined();
      expect(definition.inputSchema.properties?.['queueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('получение списка проектов', () => {
      it('должен получить список проектов без параметров', async () => {
        const mockProjects = createProjectListFixture(3);
        vi.mocked(mockTrackerFacade.getProjects).mockResolvedValue({
          projects: mockProjects,
          total: 3,
        });

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProjects).toHaveBeenCalledWith({});
        expect(mockLogger.info).toHaveBeenCalledWith('Получение списка проектов', {
          perPage: 50,
          page: 1,
          expand: 'none',
          queueId: 'all',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projects: unknown[];
            total: number;
            count: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.projects).toHaveLength(3);
        expect(parsed.data.total).toBe(3);
        expect(parsed.data.count).toBe(3);
      });

      it('должен получить список проектов с пагинацией', async () => {
        const mockProjects = createProjectListFixture(10);
        vi.mocked(mockTrackerFacade.getProjects).mockResolvedValue({
          projects: mockProjects,
          total: 50,
        });

        const result = await tool.execute({ perPage: 10, page: 2, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProjects).toHaveBeenCalledWith({
          perPage: 10,
          page: 2,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projects: unknown[];
            total: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.projects).toHaveLength(10);
        expect(parsed.data.total).toBe(50);
      });

      it('должен получить проекты с expand параметром', async () => {
        const mockProjects = createProjectListFixture(2);
        vi.mocked(mockTrackerFacade.getProjects).mockResolvedValue({
          projects: mockProjects,
          total: 2,
        });

        const result = await tool.execute({ expand: 'queues', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProjects).toHaveBeenCalledWith({
          expand: 'queues',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projects: unknown[];
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.projects).toHaveLength(2);
      });

      it('должен отфильтровать проекты по queueId', async () => {
        const mockProjects = createProjectListFixture(1);
        vi.mocked(mockTrackerFacade.getProjects).mockResolvedValue({
          projects: mockProjects,
          total: 1,
        });

        const result = await tool.execute({ queueId: 'QUEUE1', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProjects).toHaveBeenCalledWith({
          queueId: 'QUEUE1',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projects: unknown[];
            count: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.count).toBe(1);
      });

      it('должен обработать пустой список проектов', async () => {
        vi.mocked(mockTrackerFacade.getProjects).mockResolvedValue({
          projects: [],
          total: 0,
        });

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('Список проектов получен', {
          count: 0,
          total: 0,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projects: unknown[];
            total: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.projects).toHaveLength(0);
        expect(parsed.data.total).toBe(0);
      });

      it('должен обработать большое количество проектов', async () => {
        const mockProjects = createProjectListFixture(50);
        vi.mocked(mockTrackerFacade.getProjects).mockResolvedValue({
          projects: mockProjects,
          total: 100,
        });

        const result = await tool.execute({ perPage: 50, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projects: unknown[];
            count: number;
          };
        };
        expect(parsed.data.count).toBe(50);
        expect(parsed.data.projects).toHaveLength(50);
      });
    });

    describe('валидация параметров', () => {
      it('должен принять все валидные параметры', async () => {
        vi.mocked(mockTrackerFacade.getProjects).mockResolvedValue({
          projects: [],
          total: 0,
        });

        const result = await tool.execute({
          perPage: 25,
          page: 3,
          expand: 'team',
          queueId: 'TEST',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProjects).toHaveBeenCalledWith({
          perPage: 25,
          page: 3,
          expand: 'team',
          queueId: 'TEST',
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку API', async () => {
        const error = new Error('API Error: 500 Internal Server Error');
        vi.mocked(mockTrackerFacade.getProjects).mockRejectedValue(error);

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении списка проектов');
        expect(parsed.error).toContain('API Error');
      });

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.getProjects).mockRejectedValue(error);

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

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
        vi.mocked(mockTrackerFacade.getProjects).mockRejectedValue(error);

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Permission denied');
      });
    });
  });
});
