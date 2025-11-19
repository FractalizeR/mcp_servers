/**
 * Unit тесты для CreateProjectTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateProjectTool } from '@tools/api/projects/create-project.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { STANDARD_PROJECT_FIELDS } from '../../../helpers/test-fields.js';
import { createProjectFixture } from '../../../helpers/project.fixture.js';

describe('CreateProjectTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateProjectTool;

  beforeEach(() => {
    mockTrackerFacade = {
      createProject: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new CreateProjectTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('create_project', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Создать новый проект');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['key', 'name', 'lead', 'fields']);
      expect(definition.inputSchema.properties?.['key']).toBeDefined();
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
      it('должен требовать параметр key', async () => {
        const result = await tool.execute({ name: 'Test', lead: 'user1', fields: ['id', 'key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен требовать параметр name', async () => {
        const result = await tool.execute({ key: 'PROJ', lead: 'user1', fields: ['id', 'key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен требовать параметр lead', async () => {
        const result = await tool.execute({ key: 'PROJ', name: 'Test', fields: ['id', 'key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен отклонить пустые строки', async () => {
        const result = await tool.execute({
          key: '',
          name: 'Test',
          lead: 'user1',
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
        const mockProject = createProjectFixture({ key: 'NEWPROJ' });
        vi.mocked(mockTrackerFacade.createProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          key: 'NEWPROJ',
          name: 'New Project',
          lead: 'user1',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalled();
      });
    });

    describe('создание проекта', () => {
      it('должен создать проект с минимальными параметрами', async () => {
        const mockProject = createProjectFixture({
          key: 'MINIMAL',
          name: 'Minimal Project',
        });
        vi.mocked(mockTrackerFacade.createProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          key: 'MINIMAL',
          name: 'Minimal Project',
          lead: 'user1',
          fields: ['key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalledWith({
          key: 'MINIMAL',
          name: 'Minimal Project',
          lead: 'user1',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Создание нового проекта', {
          key: 'MINIMAL',
          name: 'Minimal Project',
          lead: 'user1',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projectKey: string;
            project: { key: string; name: string };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.projectKey).toBe('MINIMAL');
        expect(parsed.data.project.key).toBe('MINIMAL');
      });

      it('должен создать проект со всеми параметрами', async () => {
        const mockProject = createProjectFixture({
          key: 'FULL',
          name: 'Full Project',
          description: 'Full description',
          status: 'in_progress',
        });
        vi.mocked(mockTrackerFacade.createProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          key: 'FULL',
          name: 'Full Project',
          lead: 'user1',
          status: 'in_progress',
          description: 'Full description',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          queueIds: ['QUEUE1', 'QUEUE2'],
          teamUserIds: ['user1', 'user2'],
          fields: ['key', 'name', 'status'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalledWith({
          key: 'FULL',
          name: 'Full Project',
          lead: 'user1',
          status: 'in_progress',
          description: 'Full description',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          queueIds: ['QUEUE1', 'QUEUE2'],
          teamUserIds: ['user1', 'user2'],
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            projectKey: string;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.projectKey).toBe('FULL');
      });

      it('должен создать проект с описанием', async () => {
        const mockProject = createProjectFixture({
          key: 'PROJ',
          description: 'Project description',
        });
        vi.mocked(mockTrackerFacade.createProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          description: 'Project description',
          fields: ['key', 'description'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalledWith({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          description: 'Project description',
        });
      });

      it('должен создать проект с очередями', async () => {
        const mockProject = createProjectFixture({ key: 'PROJ' });
        vi.mocked(mockTrackerFacade.createProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          queueIds: ['QUEUE1', 'QUEUE2'],
          fields: ['key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalledWith({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          queueIds: ['QUEUE1', 'QUEUE2'],
        });
      });

      it('должен создать проект с участниками', async () => {
        const mockProject = createProjectFixture({ key: 'PROJ' });
        vi.mocked(mockTrackerFacade.createProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          teamUserIds: ['user1', 'user2', 'user3'],
          fields: ['key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalledWith({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          teamUserIds: ['user1', 'user2', 'user3'],
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "проект уже существует"', async () => {
        const error = new Error('Project already exists');
        vi.mocked(mockTrackerFacade.createProject).mockRejectedValue(error);

        const result = await tool.execute({
          key: 'EXISTS',
          name: 'Exists',
          lead: 'user1',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при создании проекта');
        expect(parsed.error).toBe('Project already exists');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.createProject).mockRejectedValue(error);

        const result = await tool.execute({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          fields: ['id', 'key'],
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
        vi.mocked(mockTrackerFacade.createProject).mockRejectedValue(error);

        const result = await tool.execute({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          fields: ['id', 'key'],
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
        vi.mocked(mockTrackerFacade.createProject).mockRejectedValue(error);

        const result = await tool.execute({
          key: 'PROJ',
          name: 'Project',
          lead: 'user1',
          fields: ['id', 'key'],
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
