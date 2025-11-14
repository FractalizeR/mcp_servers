/**
 * Unit тесты для базового класса инструментов
 */

import {describe, it, expect, vi} from 'vitest';
import { BaseTool } from '@mcp/tools/base-tool.js';
import type { ToolDefinition } from '@mcp/tools/base-tool.js';
import type { ToolCallParams, ToolResult } from '@types';
import type { YandexTrackerFacade } from '@domain/facade/yandex-tracker.facade.js';
import type { Logger } from '@infrastructure/logger.js';

/**
 * Тестовая реализация BaseTool для проверки protected методов
 */
class TestTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'test_tool',
      description: 'Test tool for unit testing',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  async execute(_params: ToolCallParams): Promise<ToolResult> {
    return this.formatSuccess({ test: 'data' });
  }

  // Публичные методы для тестирования protected методов
  public testFormatSuccess(data: unknown): ToolResult {
    return this.formatSuccess(data);
  }

  public testFormatError(message: string, error?: unknown): ToolResult {
    return this.formatError(message, error);
  }

  public testValidateRequired(
    params: ToolCallParams,
    paramName: string,
    paramType: 'string' | 'number' | 'boolean' | 'object'
  ): string | undefined {
    return this.validateRequired(params, paramName, paramType);
  }

  public testValidateRequiredParams(
    params: ToolCallParams,
    requirements: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'object' }>
  ): string | undefined {
    return this.validateRequiredParams(params, requirements);
  }
}

describe('BaseTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let testTool: TestTool;

  beforeEach(() => {
    mockTrackerFacade = {} as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    testTool = new TestTool(mockTrackerFacade, mockLogger);
  });

  describe('formatSuccess', () => {
    it('должен форматировать успешный результат', () => {
      const data = { key: 'value', number: 42 };
      const result = testTool.testFormatSuccess(data);

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.isError).toBeUndefined();

      const parsed = JSON.parse(result.content[0]?.text || '{}') as { success: boolean; data: unknown };
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual(data);
    });

    it('должен корректно форматировать null', () => {
      const result = testTool.testFormatSuccess(null);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as { success: boolean; data: null };

      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeNull();
    });

    it('должен корректно форматировать массивы', () => {
      const data = [1, 2, 3];
      const result = testTool.testFormatSuccess(data);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as { success: boolean; data: number[] };

      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual([1, 2, 3]);
    });
  });

  describe('formatError', () => {
    it('должен форматировать ошибку с сообщением', () => {
      const result = testTool.testFormatError('Test error message');

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.isError).toBe(true);

      const parsed = JSON.parse(result.content[0]?.text || '{}') as { success: boolean; message: string };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toBe('Test error message');
    });

    it('должен логировать ошибку', () => {
      testTool.testFormatError('Test error');

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', undefined);
    });

    it('должен включать сообщение из Error объекта', () => {
      const error = new Error('Original error message');
      const result = testTool.testFormatError('Context error', error);

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
        error: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toBe('Context error');
      expect(parsed.error).toBe('Original error message');
    });

    it('должен обрабатывать не-Error объекты', () => {
      const error = 'string error';
      const result = testTool.testFormatError('Context error', error);

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
        error?: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toBe('Context error');
      expect(parsed.error).toBeUndefined();
    });
  });

  describe('validateRequired', () => {
    it('должен вернуть ошибку для undefined параметра', () => {
      const error = testTool.testValidateRequired({}, 'param', 'string');
      expect(error).toBe('Параметр "param" обязателен');
    });

    it('должен вернуть ошибку для null параметра', () => {
      const error = testTool.testValidateRequired({ param: null }, 'param', 'string');
      expect(error).toBe('Параметр "param" обязателен');
    });

    it('должен вернуть ошибку для неправильного типа', () => {
      const error = testTool.testValidateRequired({ param: 123 }, 'param', 'string');
      expect(error).toBe('Параметр "param" должен быть типа string');
    });

    it('должен вернуть ошибку для пустой строки', () => {
      const error = testTool.testValidateRequired({ param: '   ' }, 'param', 'string');
      expect(error).toBe('Параметр "param" не может быть пустой строкой');
    });

    it('не должен вернуть ошибку для валидной строки', () => {
      const error = testTool.testValidateRequired({ param: 'valid' }, 'param', 'string');
      expect(error).toBeUndefined();
    });

    it('должен корректно валидировать number', () => {
      const error = testTool.testValidateRequired({ param: 42 }, 'param', 'number');
      expect(error).toBeUndefined();
    });

    it('должен корректно валидировать boolean', () => {
      const error = testTool.testValidateRequired({ param: true }, 'param', 'boolean');
      expect(error).toBeUndefined();
    });

    it('должен корректно валидировать object', () => {
      const error = testTool.testValidateRequired({ param: { key: 'value' } }, 'param', 'object');
      expect(error).toBeUndefined();
    });

    it('должен корректно валидировать массив как object', () => {
      const error = testTool.testValidateRequired({ param: [1, 2, 3] }, 'param', 'object');
      expect(error).toBeUndefined();
    });

    it('должен принимать 0 как валидное number значение', () => {
      const error = testTool.testValidateRequired({ param: 0 }, 'param', 'number');
      expect(error).toBeUndefined();
    });

    it('должен принимать false как валидное boolean значение', () => {
      const error = testTool.testValidateRequired({ param: false }, 'param', 'boolean');
      expect(error).toBeUndefined();
    });
  });

  describe('validateRequiredParams', () => {
    it('должен валидировать несколько параметров', () => {
      const params = {
        str: 'text',
        num: 42,
        bool: true,
      };

      const error = testTool.testValidateRequiredParams(params, [
        { name: 'str', type: 'string' },
        { name: 'num', type: 'number' },
        { name: 'bool', type: 'boolean' },
      ]);

      expect(error).toBeUndefined();
    });

    it('должен вернуть ошибку для первого невалидного параметра', () => {
      const params = {
        valid: 'text',
        invalid: 123, // должна быть строка
      };

      const error = testTool.testValidateRequiredParams(params, [
        { name: 'valid', type: 'string' },
        { name: 'invalid', type: 'string' },
      ]);

      expect(error).toBe('Параметр "invalid" должен быть типа string');
    });

    it('должен вернуть ошибку для отсутствующего параметра', () => {
      const params = {
        param1: 'text',
      };

      const error = testTool.testValidateRequiredParams(params, [
        { name: 'param1', type: 'string' },
        { name: 'param2', type: 'string' },
      ]);

      expect(error).toBe('Параметр "param2" обязателен');
    });

    it('не должен вернуть ошибку для пустого списка требований', () => {
      const error = testTool.testValidateRequiredParams({}, []);
      expect(error).toBeUndefined();
    });
  });

  describe('getDefinition', () => {
    it('должен вернуть определение инструмента', () => {
      const definition = testTool.getDefinition();

      expect(definition.name).toBe('test_tool');
      expect(definition.description).toBe('Test tool for unit testing');
      expect(definition.inputSchema.type).toBe('object');
    });
  });

  describe('execute', () => {
    it('должен выполниться успешно', async () => {
      const result = await testTool.execute({});

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as { success: boolean; data: unknown };
      expect(parsed.success).toBe(true);
    });
  });
});
