/**
 * Unit тесты для CreateComponentTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateComponentTool } from '@tools/api/components/create-component.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createComponentFixture } from '../../../helpers/component.fixture.js';

describe('CreateComponentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateComponentTool;

  beforeEach(() => {
    mockTrackerFacade = {
      createComponent: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new CreateComponentTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('create_component', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('компонент');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('queueId');
      expect(definition.inputSchema.required).toContain('name');
      expect(definition.inputSchema.properties?.['queueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['name']).toBeDefined();
      expect(definition.inputSchema.properties?.['description']).toBeDefined();
      expect(definition.inputSchema.properties?.['lead']).toBeDefined();
      expect(definition.inputSchema.properties?.['assignAuto']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если обязательные поля не указаны', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку если queueId не указан', async () => {
        const result = await tool.execute({
          name: 'Test Component',
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку если name не указан', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого queueId', async () => {
        const result = await tool.execute({
          queueId: '',
          name: 'Test Component',
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого name', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          name: '',
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректные минимальные параметры', async () => {
        const mockComponent = createComponentFixture({ name: 'Test Component' });
        vi.mocked(mockTrackerFacade.createComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'Test Component',
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createComponent).toHaveBeenCalled();
      });
    });

    describe('создание компонента', () => {
      it('должен создать компонент с минимальными обязательными полями', async () => {
        const mockComponent = createComponentFixture({
          id: '123',
          name: 'Test Component',
        });
        vi.mocked(mockTrackerFacade.createComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'Test Component',
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createComponent).toHaveBeenCalledWith({
          queueId: 'TEST',
          name: 'Test Component',
          description: undefined,
          lead: undefined,
          assignAuto: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Создание компонента', {
          queueId: 'TEST',
          name: 'Test Component',
          hasDescription: false,
          hasLead: false,
          assignAuto: false,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Компонент создан', {
          componentId: '123',
          name: 'Test Component',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            component: { id: string; name: string };
            message: string;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.component.id).toBe('123');
        expect(parsed.data.component.name).toBe('Test Component');
        expect(parsed.data.message).toContain('успешно создан');
      });

      it('должен создать компонент с описанием', async () => {
        const mockComponent = createComponentFixture({
          name: 'Backend',
          description: 'Backend services',
        });
        vi.mocked(mockTrackerFacade.createComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          queueId: 'PROJ',
          name: 'Backend',
          description: 'Backend services',
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createComponent).toHaveBeenCalledWith({
          queueId: 'PROJ',
          name: 'Backend',
          description: 'Backend services',
          lead: undefined,
          assignAuto: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Создание компонента', {
          queueId: 'PROJ',
          name: 'Backend',
          hasDescription: true,
          hasLead: false,
          assignAuto: false,
        });
      });

      it('должен создать компонент с руководителем', async () => {
        const mockComponent = createComponentFixture({
          name: 'Frontend',
        });
        vi.mocked(mockTrackerFacade.createComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          queueId: 'PROJ',
          name: 'Frontend',
          lead: 'user-login',
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createComponent).toHaveBeenCalledWith({
          queueId: 'PROJ',
          name: 'Frontend',
          description: undefined,
          lead: 'user-login',
          assignAuto: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Создание компонента', {
          queueId: 'PROJ',
          name: 'Frontend',
          hasDescription: false,
          hasLead: true,
          assignAuto: false,
        });
      });

      it('должен создать компонент с автоназначением', async () => {
        const mockComponent = createComponentFixture({
          name: 'Mobile',
          assignAuto: true,
        });
        vi.mocked(mockTrackerFacade.createComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          queueId: 'PROJ',
          name: 'Mobile',
          assignAuto: true,
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createComponent).toHaveBeenCalledWith({
          queueId: 'PROJ',
          name: 'Mobile',
          description: undefined,
          lead: undefined,
          assignAuto: true,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Создание компонента', {
          queueId: 'PROJ',
          name: 'Mobile',
          hasDescription: false,
          hasLead: false,
          assignAuto: true,
        });
      });

      it('должен создать компонент со всеми опциональными полями', async () => {
        const mockComponent = createComponentFixture({
          name: 'Full Component',
          description: 'Full description',
          assignAuto: true,
        });
        vi.mocked(mockTrackerFacade.createComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          queueId: 'FULL',
          name: 'Full Component',
          description: 'Full description',
          lead: 'admin',
          assignAuto: true,
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createComponent).toHaveBeenCalledWith({
          queueId: 'FULL',
          name: 'Full Component',
          description: 'Full description',
          lead: 'admin',
          assignAuto: true,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Создание компонента', {
          queueId: 'FULL',
          name: 'Full Component',
          hasDescription: true,
          hasLead: true,
          assignAuto: true,
        });
      });

      it('должен создать компонент с assignAuto=false', async () => {
        const mockComponent = createComponentFixture({
          name: 'No Auto',
          assignAuto: false,
        });
        vi.mocked(mockTrackerFacade.createComponent).mockResolvedValue(mockComponent);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'No Auto',
          assignAuto: false,
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.createComponent).toHaveBeenCalledWith({
          queueId: 'TEST',
          name: 'No Auto',
          description: undefined,
          lead: undefined,
          assignAuto: false,
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "компонент уже существует"', async () => {
        const error = new Error('Component already exists');
        vi.mocked(mockTrackerFacade.createComponent).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'Duplicate',
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при создании компонента');
        expect(parsed.error).toBe('Component already exists');
      });

      it('должен обработать ошибку "очередь не найдена"', async () => {
        const error = new Error('Queue not found');
        vi.mocked(mockTrackerFacade.createComponent).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'NOTEXIST',
          name: 'Test',
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Queue not found');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.createComponent).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'Test Component',
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
        vi.mocked(mockTrackerFacade.createComponent).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'Test Component',
          lead: 'invalid-user',
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
        vi.mocked(mockTrackerFacade.createComponent).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'Test Component',
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
        vi.mocked(mockTrackerFacade.createComponent).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          name: 'Test Component',
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
