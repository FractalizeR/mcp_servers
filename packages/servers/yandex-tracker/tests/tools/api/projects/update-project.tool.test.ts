/**
 * Unit тесты для UpdateProjectTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateProjectTool } from '#tools/api/projects/update-project.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createProjectFixture } from '#helpers/project.fixture.js';

describe('UpdateProjectTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateProjectTool;

  beforeEach(() => {
    mockTrackerFacade = {
      updateProject: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new UpdateProjectTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('update_project', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('[Projects/Write] Обновить проект');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('projectId');
      expect(definition.inputSchema.properties?.['projectId']).toBeDefined();
      expect(definition.inputSchema.properties?.['name']).toBeDefined();
      expect(definition.inputSchema.properties?.['lead']).toBeDefined();
      expect(definition.inputSchema.properties?.['status']).toBeDefined();
      expect(definition.inputSchema.properties?.['description']).toBeDefined();
      expect(definition.inputSchema.properties?.['startDate']).toBeDefined();
      expect(definition.inputSchema.properties?.['endDate']).toBeDefined();
      expect(definition.inputSchema.properties?.['queueIds']).toBeDefined();
      expect(definition.inputSchema.properties?.['teamUserIds']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен требовать параметр projectId', async () => {
        const result = await tool.execute({ name: 'Updated', fields: ['id', 'key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен отклонить пустой projectId', async () => {
        const result = await tool.execute({
          projectId: '',
          name: 'Updated',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректные параметры', async () => {
        const mockProject = createProjectFixture({ key: 'PROJ' });
        vi.mocked(mockTrackerFacade.updateProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'PROJ',
          name: 'Updated',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateProject).toHaveBeenCalled();
      });
    });

    describe('обновление проекта', () => {
      it('должен обновить название проекта', async () => {
        const mockProject = createProjectFixture({
          key: 'PROJ',
          name: 'Updated Name',
        });
        vi.mocked(mockTrackerFacade.updateProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'PROJ',
          name: 'Updated Name',
          fields: ['key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateProject).toHaveBeenCalledWith({
          projectId: 'PROJ',
          data: { name: 'Updated Name' },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление проекта', {
          projectId: 'PROJ',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projectKey: string;
            project: { name: string };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.project.name).toBe('Updated Name');
      });

      it('должен обновить статус проекта', async () => {
        const mockProject = createProjectFixture({
          key: 'PROJ',
          status: 'launched',
        });
        vi.mocked(mockTrackerFacade.updateProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'PROJ',
          status: 'launched',
          fields: ['key', 'status'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateProject).toHaveBeenCalledWith({
          projectId: 'PROJ',
          data: { status: 'launched' },
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            project: { status: string };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.project.status).toBe('launched');
      });

      it('должен обновить несколько полей проекта', async () => {
        const mockProject = createProjectFixture({
          key: 'PROJ',
          name: 'New Name',
          description: 'New description',
          status: 'in_progress',
        });
        vi.mocked(mockTrackerFacade.updateProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'PROJ',
          name: 'New Name',
          description: 'New description',
          status: 'in_progress',
          fields: ['key', 'name', 'description', 'status'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateProject).toHaveBeenCalledWith({
          projectId: 'PROJ',
          data: {
            name: 'New Name',
            description: 'New description',
            status: 'in_progress',
          },
        });
      });

      it('должен обновить даты проекта', async () => {
        const mockProject = createProjectFixture({
          key: 'PROJ',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });
        vi.mocked(mockTrackerFacade.updateProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'PROJ',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          fields: ['key', 'startDate', 'endDate'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateProject).toHaveBeenCalledWith({
          projectId: 'PROJ',
          data: {
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          },
        });
      });

      it('должен обновить очереди проекта', async () => {
        const mockProject = createProjectFixture({ key: 'PROJ' });
        vi.mocked(mockTrackerFacade.updateProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'PROJ',
          queueIds: ['QUEUE1', 'QUEUE2'],
          fields: ['key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateProject).toHaveBeenCalledWith({
          projectId: 'PROJ',
          data: {
            queueIds: ['QUEUE1', 'QUEUE2'],
          },
        });
      });

      it('должен обновить участников проекта', async () => {
        const mockProject = createProjectFixture({ key: 'PROJ' });
        vi.mocked(mockTrackerFacade.updateProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'PROJ',
          teamUserIds: ['user1', 'user2'],
          fields: ['key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateProject).toHaveBeenCalledWith({
          projectId: 'PROJ',
          data: {
            teamUserIds: ['user1', 'user2'],
          },
        });
      });

      it('должен обновить все поля проекта', async () => {
        const mockProject = createProjectFixture({
          key: 'FULL',
          name: 'Full Update',
        });
        vi.mocked(mockTrackerFacade.updateProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          projectId: 'FULL',
          name: 'Full Update',
          lead: 'newlead',
          status: 'launched',
          description: 'Full description',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          queueIds: ['QUEUE1'],
          teamUserIds: ['user1'],
          fields: ['key', 'name', 'lead', 'status'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateProject).toHaveBeenCalledWith({
          projectId: 'FULL',
          data: {
            name: 'Full Update',
            lead: 'newlead',
            status: 'launched',
            description: 'Full description',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            queueIds: ['QUEUE1'],
            teamUserIds: ['user1'],
          },
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "проект не найден"', async () => {
        const error = new Error('Project not found');
        vi.mocked(mockTrackerFacade.updateProject).mockRejectedValue(error);

        const result = await tool.execute({
          projectId: 'NOTEXIST',
          name: 'Updated',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при обновлении проекта');
        expect(parsed.error).toBe('Project not found');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.updateProject).mockRejectedValue(error);

        const result = await tool.execute({
          projectId: 'RESTRICTED',
          name: 'Updated',
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

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.updateProject).mockRejectedValue(error);

        const result = await tool.execute({
          projectId: 'PROJ',
          name: 'Updated',
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

      it('должен обработать ошибку API', async () => {
        const error = new Error('API Error: 500 Internal Server Error');
        vi.mocked(mockTrackerFacade.updateProject).mockRejectedValue(error);

        const result = await tool.execute({
          projectId: 'PROJ',
          name: 'Updated',
          fields: ['id', 'key', 'name'],
        });

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
