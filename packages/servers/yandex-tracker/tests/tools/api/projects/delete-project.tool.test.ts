/**
 * Unit тесты для DeleteProjectTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteProjectTool } from '#tools/api/projects/delete-project.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

describe('DeleteProjectTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteProjectTool;

  beforeEach(() => {
    mockTrackerFacade = {
      deleteProject: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new DeleteProjectTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('delete_project', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('[Projects/Delete] Удалить проект');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('projectId');
      expect(definition.inputSchema.properties?.['projectId']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен требовать параметр projectId', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен отклонить пустой projectId', async () => {
        const result = await tool.execute({ projectId: '' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректный projectId', async () => {
        vi.mocked(mockTrackerFacade.deleteProject).mockResolvedValue();

        const result = await tool.execute({ projectId: 'PROJ' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteProject).toHaveBeenCalled();
      });
    });

    describe('удаление проекта', () => {
      it('должен удалить проект по ключу', async () => {
        vi.mocked(mockTrackerFacade.deleteProject).mockResolvedValue();

        const result = await tool.execute({ projectId: 'MYPROJ' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteProject).toHaveBeenCalledWith({
          projectId: 'MYPROJ',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Удаление проекта', {
          projectId: 'MYPROJ',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Проект успешно удален', {
          projectId: 'MYPROJ',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            message: string;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.message).toContain('успешно удален');
      });

      it('должен удалить проект по ID', async () => {
        vi.mocked(mockTrackerFacade.deleteProject).mockResolvedValue();

        const result = await tool.execute({ projectId: 'project123' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteProject).toHaveBeenCalledWith({
          projectId: 'project123',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            message: string;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.message).toContain('project123');
      });

      it('должен логировать правильное сообщение при удалении', async () => {
        vi.mocked(mockTrackerFacade.deleteProject).mockResolvedValue();

        await tool.execute({ projectId: 'TESTPROJ' });

        expect(mockLogger.info).toHaveBeenCalledTimes(2);
        expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'Удаление проекта', {
          projectId: 'TESTPROJ',
        });
        expect(mockLogger.info).toHaveBeenNthCalledWith(2, 'Проект успешно удален', {
          projectId: 'TESTPROJ',
        });
      });

      it('должен удалить проект с коротким ключом', async () => {
        vi.mocked(mockTrackerFacade.deleteProject).mockResolvedValue();

        const result = await tool.execute({ projectId: 'P' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteProject).toHaveBeenCalledWith({
          projectId: 'P',
        });
      });

      it('должен удалить проект с длинным ключом', async () => {
        vi.mocked(mockTrackerFacade.deleteProject).mockResolvedValue();

        const result = await tool.execute({
          projectId: 'VERYLONGPROJECTKEY',
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteProject).toHaveBeenCalledWith({
          projectId: 'VERYLONGPROJECTKEY',
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "проект не найден"', async () => {
        const error = new Error('Project not found');
        vi.mocked(mockTrackerFacade.deleteProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'NOTEXIST' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при удалении проекта');
        expect(parsed.error).toBe('Project not found');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.deleteProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'RESTRICTED' });

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
        vi.mocked(mockTrackerFacade.deleteProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'PROJ' });

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
        vi.mocked(mockTrackerFacade.deleteProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'PROJ' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toContain('API Error');
      });

      it('должен обработать ошибку "проект используется"', async () => {
        const error = new Error('Project is in use and cannot be deleted');
        vi.mocked(mockTrackerFacade.deleteProject).mockRejectedValue(error);

        const result = await tool.execute({ projectId: 'INUSE' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toContain('in use');
      });
    });
  });
});
