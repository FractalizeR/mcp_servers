/**
 * Unit тесты для DemoTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DemoTool } from '#tools/helpers/demo/demo.tool.js';
import { ToolCategory, buildToolName } from '@mcp-framework/core';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import { MCP_TOOL_PREFIX } from '#constants';

describe('DemoTool', () => {
  let tool: DemoTool;
  let mockLogger: Logger;
  let mockTrackerFacade: YandexTrackerFacade;

  beforeEach(() => {
    mockTrackerFacade = {} as unknown as YandexTrackerFacade;

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as Logger;

    tool = new DemoTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('demo', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Демонстрационный инструмент');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['message']);
      expect(definition.inputSchema.properties?.['message']).toBeDefined();
    });
  });

  describe('getMetadata', () => {
    it('должен вернуть корректные метаданные', () => {
      const metadata = tool.getMetadata();

      expect(metadata.category).toBe(ToolCategory.HELPERS);
      expect(metadata.isHelper).toBe(true);
      expect(metadata.tags).toContain('demo');
      expect(metadata.tags).toContain('example');
      expect(metadata.tags).toContain('test');
    });
  });

  describe('execute', () => {
    describe('Валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если message не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку если message пустая строка', async () => {
        const result = await tool.execute({ message: '' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принять корректный message', async () => {
        const result = await tool.execute({ message: 'Hello!' });

        expect(result.isError).toBeUndefined();
      });
    });

    describe('Функциональность', () => {
      it('должен вернуть демонстрационный ответ с сообщением', async () => {
        const result = await tool.execute({ message: 'Test message' });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            status: string;
            message: string;
            timestamp: string;
            info: string;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.status).toBe('success');
        expect(parsed.data.message).toContain('Test message');
        expect(parsed.data.message).toContain('Демонстрационный ответ');
      });

      it('должен включить timestamp в ответ', async () => {
        const result = await tool.execute({ message: 'Test' });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            timestamp: string;
          };
        };
        expect(parsed.data.timestamp).toBeDefined();
        expect(parsed.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('должен включить информацию о демонстрации', async () => {
        const result = await tool.execute({ message: 'Test' });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            info: string;
          };
        };
        expect(parsed.data.info).toContain('масштабируемости');
      });
    });

    describe('Логирование', () => {
      it('должен логировать вызов инструмента', async () => {
        await tool.execute({ message: 'Test message' });

        expect(mockLogger.info).toHaveBeenCalledWith(
          'DemoTool вызван',
          expect.objectContaining({
            message: 'Test message',
          })
        );
      });
    });

    describe('Обработка ошибок', () => {
      it('должен обработать неожиданную ошибку', async () => {
        // Создаём инструмент с мок-логгером, который бросает ошибку
        const errorLogger = {
          info: vi.fn(() => {
            throw new Error('Logger error');
          }),
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
        } as unknown as Logger;

        const errorTool = new DemoTool({} as unknown as YandexTrackerFacade, errorLogger);
        const result = await errorTool.execute({ message: 'Test' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка выполнения DemoTool');
        expect(parsed.error).toBe('Logger error');
      });
    });
  });

  describe('METADATA', () => {
    it('должен иметь статические метаданные', () => {
      expect(DemoTool.METADATA).toBeDefined();
      expect(DemoTool.METADATA.name).toBe(buildToolName('demo', MCP_TOOL_PREFIX));
      expect(DemoTool.METADATA.description).toBe('[Helpers/Demo] Тестовый инструмент');
      expect(DemoTool.METADATA.category).toBe(ToolCategory.HELPERS);
      expect(DemoTool.METADATA.tags).toContain('demo');
      expect(DemoTool.METADATA.isHelper).toBe(true);
    });
  });
});
