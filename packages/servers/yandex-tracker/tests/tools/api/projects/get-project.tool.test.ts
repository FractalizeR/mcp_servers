/**
 * Unit тесты для GetProjectTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetProjectTool } from '@tools/api/projects/get-project.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createProjectFixture } from '../../../helpers/project.fixture.js';

describe('GetProjectTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetProjectTool;

  beforeEach(() => {
    mockTrackerFacade = {
      getProject: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetProjectTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_project', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Получить детальную информацию');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('projectId');
      expect(definition.inputSchema.properties?.['projectId']).toBeDefined();
      expect(definition.inputSchema.properties?.['expand']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если projectId не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого projectId', async () => {
        const result = await tool.execute({ projectId: '', fields: ['id', 'key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректный projectId', async () => {
        const mockProject = createProjectFixture({ key: 'PROJ1' });
        vi.mocked(mockTrackerFacade.getProject).mockResolvedValue(mockProject);

        const result = await tool.execute({ projectId: 'PROJ1', fields: ['key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProject).toHaveBeenCalledWith({
          projectId: 'PROJ1',
        });
      });
    });

    describe('получение проекта', () => {
      it('должен получить проект по ключу', async () => {
        const mockProject = createProjectFixture({
          key: 'MYPROJ',
          name: 'My Project',
        });
        vi.mocked(mockTrackerFacade.getProject).mockResolvedValue(mockProject);

        const result = await tool.execute({ projectId: 'MYPROJ', fields: ['key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProject).toHaveBeenCalledWith({
          projectId: 'MYPROJ',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Получение проекта', {
          projectId: 'MYPROJ',
          expand: 'none',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Проект получен', {
          projectKey: 'MYPROJ',
          projectName: 'My Project',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            project: { key: string; name: string };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.project.key).toBe('MYPROJ');
        expect(parsed.data.project.name).toBe('My Project');
      });

      it('должен получить проект по ID', async () => {
        const mockProject = createProjectFixture({
          id: 'project123',
          key: 'PROJ',
        });
        vi.mocked(mockTrackerFacade.getProject).mockResolvedValue(mockProject);

        const result = await tool.execute({ projectId: 'project123', fields: ['id', 'key'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProject).toHaveBeenCalledWith({
          projectId: 'project123',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            project: { id: string };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.project.id).toBe('project123');
      });

      it('должен получить проект с expand параметром', async () => {
        const mockProject = createProjectFixture({ key: 'PROJ' });
        vi.mocked(mockTrackerFacade.getProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'PROJ',
          expand: 'queues',
          fields: ['key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getProject).toHaveBeenCalledWith({
          projectId: 'PROJ',
          expand: 'queues',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Получение проекта', {
          projectId: 'PROJ',
          expand: 'queues',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Проект получен', {
          projectKey: 'PROJ',
          projectName: 'Test Project',
        });
      });

      it('должен получить проект с полными данными', async () => {
        const mockProject = createProjectFixture({
          key: 'FULL',
          name: 'Full Project',
          description: 'Full description',
          status: 'in_progress',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });
        vi.mocked(mockTrackerFacade.getProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'FULL',
          fields: ['key', 'name', 'description', 'status'],
        });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            project: {
              key: string;
              name: string;
              description?: string;
              status: string;
            };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.project.key).toBe('FULL');
        expect(parsed.data.project.name).toBe('Full Project');
        expect(parsed.data.project.description).toBe('Full description');
        expect(parsed.data.project.status).toBe('in_progress');
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "проект не найден"', async () => {
        const error = new Error('Project not found');
        vi.mocked(mockTrackerFacade.getProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'NOTEXIST', fields: ['id', 'key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении проекта');
        expect(parsed.error).toBe('Project not found');
      });

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.getProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'PROJ', fields: ['id', 'key'] });

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
        vi.mocked(mockTrackerFacade.getProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'RESTRICTED', fields: ['id', 'key'] });

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
        vi.mocked(mockTrackerFacade.getProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'PROJ', fields: ['id', 'key'] });

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
