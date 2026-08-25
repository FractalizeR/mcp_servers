/**
 * Unit тесты для CreateProjectTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateProjectTool } from '#tools/api/projects/create-project.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createProjectFixture } from '#helpers/project.fixture.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

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
      expect(definition.description).toContain('[Projects/Write] Создать новый проект');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['queues', 'name', 'fields']);
      expect(definition.inputSchema.properties?.['queues']).toBeDefined();
      expect(definition.inputSchema.properties?.['name']).toBeDefined();
      expect(definition.inputSchema.properties?.['lead']).toBeDefined();
      expect(definition.inputSchema.properties?.['status']).toBeDefined();
      expect(definition.inputSchema.properties?.['description']).toBeDefined();
      expect(definition.inputSchema.properties?.['startDate']).toBeDefined();
      expect(definition.inputSchema.properties?.['endDate']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
      expect(definition.inputSchema.properties?.['key']).toBeUndefined();
      expect(definition.inputSchema.properties?.['queueIds']).toBeUndefined();
      expect(definition.inputSchema.properties?.['teamUserIds']).toBeUndefined();
    });

    it('описание queues должно называть ключ очереди, а не ID', () => {
      const definition = tool.getDefinition();
      const queuesProp = definition.inputSchema.properties?.['queues'] as {
        description?: string;
      };

      expect(queuesProp.description ?? '').toMatch(/ключ/i);
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен требовать параметр queues', async () => {
        const result = await tool.execute({ name: 'Test', fields: ['id', 'key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен требовать параметр name', async () => {
        const result = await tool.execute({ queues: 'PROJQ', fields: ['id', 'key'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен отклонить пустые строки', async () => {
        const result = await tool.execute({
          queues: '',
          name: 'Test',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен отклонить startDate не в формате YYYY-MM-DD', async () => {
        const result = await tool.execute({
          queues: 'PROJQ',
          name: 'Test',
          startDate: '01/01/2024',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен отклонить endDate не в формате YYYY-MM-DD', async () => {
        const result = await tool.execute({
          queues: 'PROJQ',
          name: 'Test',
          endDate: '2024/12/31',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен отклонить вызов старого контракта (key вместо queues)', async () => {
        // `key` в схеме больше не объявлен — старый вызов без обязательного
        // `queues` отвергается как вызов без `queues`, а не из-за наличия `key`.
        const result = await tool.execute({
          key: 'PROJ',
          name: 'Test',
          lead: 'user1',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректные параметры без lead', async () => {
        const mockProject = createProjectFixture({ key: 'NEWPROJ' });
        vi.mocked(mockTrackerFacade.createProject).mockResolvedValue(mockProject);

        const result = await tool.execute({
          queues: 'NEWQUEUE',
          name: 'New Project',
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
          queues: 'MINQUEUE',
          name: 'Minimal Project',
          fields: ['key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalledWith({
          queues: 'MINQUEUE',
          name: 'Minimal Project',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Создание нового проекта', {
          name: 'Minimal Project',
          queues: 'MINQUEUE',
          lead: undefined,
        });

        const parsed = JSON.parse(getTextContent(result)) as {
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
          queues: 'FULLQUEUE',
          name: 'Full Project',
          lead: 'user1',
          status: 'in_progress',
          description: 'Full description',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          fields: ['key', 'name', 'status'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalledWith({
          queues: 'FULLQUEUE',
          name: 'Full Project',
          lead: 'user1',
          status: 'in_progress',
          description: 'Full description',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });

        const parsed = JSON.parse(getTextContent(result)) as {
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
          queues: 'PROJQUEUE',
          name: 'Project',
          lead: 'user1',
          description: 'Project description',
          fields: ['key', 'description'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createProject).toHaveBeenCalledWith({
          queues: 'PROJQUEUE',
          name: 'Project',
          lead: 'user1',
          description: 'Project description',
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "проект уже существует"', async () => {
        const error = new Error('Project already exists');
        vi.mocked(mockTrackerFacade.createProject).mockRejectedValue(error);

        const result = await tool.execute({
          queues: 'EXISTSQ',
          name: 'Exists',
          lead: 'user1',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
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
          queues: 'PROJQUEUE',
          name: 'Project',
          lead: 'user1',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
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
          queues: 'PROJQUEUE',
          name: 'Project',
          lead: 'user1',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
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
          queues: 'PROJQUEUE',
          name: 'Project',
          lead: 'user1',
          fields: ['id', 'key'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
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
