/**
 * Unit тесты для UpdateComponentTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateComponentTool } from '@tools/api/components/update-component.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createComponentFixture } from '../../../helpers/component.fixture.js';

describe('UpdateComponentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateComponentTool;

  beforeEach(() => {
    mockTrackerFacade = {
      updateComponent: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new UpdateComponentTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('update_component', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('параметры компонента');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('componentId');
      expect(definition.inputSchema.required).toContain('fields');
      expect(definition.inputSchema.properties?.['componentId']).toBeDefined();
      expect(definition.inputSchema.properties?.['name']).toBeDefined();
      expect(definition.inputSchema.properties?.['description']).toBeDefined();
      expect(definition.inputSchema.properties?.['lead']).toBeDefined();
      expect(definition.inputSchema.properties?.['assignAuto']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если componentId не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого componentId', async () => {
        const result = await tool.execute({ componentId: '', fields: ['id', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать только componentId без обновлений', async () => {
        const mockComponent = createComponentFixture({ id: '123' });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({ componentId: '123', fields: ['id', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: undefined,
          description: undefined,
          lead: undefined,
          assignAuto: undefined,
        });
      });

      it('должен вернуть ошибку для пустого name', async () => {
        const result = await tool.execute({
          componentId: '123',
          name: '',
          fields: ['id', 'name'],
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

    describe('обновление компонента', () => {
      it('должен обновить только name', async () => {
        const mockComponent = createComponentFixture({
          id: '123',
          name: 'Updated Component',
        });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          componentId: '123',
          name: 'Updated Component',
          fields: ['id', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: 'Updated Component',
          description: undefined,
          lead: undefined,
          assignAuto: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление компонента', {
          componentId: '123',
          hasName: true,
          hasDescription: false,
          hasLead: false,
          hasAssignAuto: false,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Компонент обновлен', {
          componentId: '123',
          name: 'Updated Component',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            component: { id: string; name: string };
            message: string;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.component.name).toBe('Updated Component');
        expect(parsed.data.message).toContain('успешно обновлен');
      });

      it('должен обновить только description', async () => {
        const mockComponent = createComponentFixture({
          id: '123',
          description: 'New description',
        });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          componentId: '123',
          description: 'New description',
          fields: ['id', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: undefined,
          description: 'New description',
          lead: undefined,
          assignAuto: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление компонента', {
          componentId: '123',
          hasName: false,
          hasDescription: true,
          hasLead: false,
          hasAssignAuto: false,
        });
      });

      it('должен обновить только lead', async () => {
        const mockComponent = createComponentFixture({ id: '123' });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          componentId: '123',
          lead: 'new-lead',
          fields: ['id', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: undefined,
          description: undefined,
          lead: 'new-lead',
          assignAuto: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление компонента', {
          componentId: '123',
          hasName: false,
          hasDescription: false,
          hasLead: true,
          hasAssignAuto: false,
        });
      });

      it('должен обновить только assignAuto', async () => {
        const mockComponent = createComponentFixture({
          id: '123',
          assignAuto: true,
        });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          componentId: '123',
          assignAuto: true,
          fields: ['id', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: undefined,
          description: undefined,
          lead: undefined,
          assignAuto: true,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление компонента', {
          componentId: '123',
          hasName: false,
          hasDescription: false,
          hasLead: false,
          hasAssignAuto: true,
        });
      });

      it('должен обновить несколько полей одновременно', async () => {
        const mockComponent = createComponentFixture({
          id: '123',
          name: 'Updated',
          description: 'Updated description',
        });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          componentId: '123',
          name: 'Updated',
          description: 'Updated description',
          lead: 'admin',
          fields: ['id', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: 'Updated',
          description: 'Updated description',
          lead: 'admin',
          assignAuto: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление компонента', {
          componentId: '123',
          hasName: true,
          hasDescription: true,
          hasLead: true,
          hasAssignAuto: false,
        });
      });

      it('должен обновить все возможные поля', async () => {
        const mockComponent = createComponentFixture({
          id: '123',
          name: 'Full Update',
          description: 'Full description',
          assignAuto: true,
        });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          componentId: '123',
          name: 'Full Update',
          description: 'Full description',
          lead: 'newlead',
          assignAuto: true,
          fields: ['id', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: 'Full Update',
          description: 'Full description',
          lead: 'newlead',
          assignAuto: true,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Обновление компонента', {
          componentId: '123',
          hasName: true,
          hasDescription: true,
          hasLead: true,
          hasAssignAuto: true,
        });
      });

      it('должен обновить assignAuto на false', async () => {
        const mockComponent = createComponentFixture({
          id: '123',
          assignAuto: false,
        });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          componentId: '123',
          assignAuto: false,
          fields: ['id', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: undefined,
          description: undefined,
          lead: undefined,
          assignAuto: false,
        });
      });

      it('должен обновить description на пустую строку', async () => {
        const mockComponent = createComponentFixture({
          id: '123',
          description: '',
        });
        vi.mocked(mockTrackerFacade.updateComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          componentId: '123',
          description: '',
          fields: ['id', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.updateComponent).toHaveBeenCalledWith({
          componentId: '123',
          name: undefined,
          description: '',
          lead: undefined,
          assignAuto: undefined,
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "компонент не найден"', async () => {
        const error = new Error('Component not found');
        vi.mocked(mockTrackerFacade.updateComponent).mockRejectedValue(error);

        const result = await tool.execute({
          componentId: 'NOTEXIST',
          name: 'New Name',
          fields: ['id', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при обновлении компонента');
        expect(parsed.error).toBe('Component not found');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.updateComponent).mockRejectedValue(error);

        const result = await tool.execute({
          componentId: '123',
          name: 'New Name',
          fields: ['id', 'name'],
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
        vi.mocked(mockTrackerFacade.updateComponent).mockRejectedValue(error);

        const result = await tool.execute({
          componentId: '123',
          lead: 'invalid-user',
          fields: ['id', 'name'],
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
        vi.mocked(mockTrackerFacade.updateComponent).mockRejectedValue(error);

        const result = await tool.execute({
          componentId: '123',
          description: 'New description',
          fields: ['id', 'name'],
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
        vi.mocked(mockTrackerFacade.updateComponent).mockRejectedValue(error);

        const result = await tool.execute({
          componentId: '123',
          name: 'New Name',
          fields: ['id', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toContain('API Error');
      });
    });
  });
});
