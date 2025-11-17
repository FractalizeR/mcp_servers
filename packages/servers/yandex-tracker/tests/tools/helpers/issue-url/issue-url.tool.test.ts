/**
 * Unit тесты для IssueUrlTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IssueUrlTool } from '@tools/helpers/issue-url/issue-url.tool.js';
import { ToolCategory } from '@mcp-framework/core';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';

describe('IssueUrlTool', () => {
  let tool: IssueUrlTool;
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

    tool = new IssueUrlTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('get_issue_urls');
      expect(definition.description).toContain('URL');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueKeys']);
      expect(definition.inputSchema.properties?.['issueKeys']).toBeDefined();
    });
  });

  describe('getMetadata', () => {
    it('должен вернуть корректные метаданные', () => {
      const metadata = tool.getMetadata();

      expect(metadata.category).toBe(ToolCategory.URL_GENERATION);
      expect(metadata.isHelper).toBe(true);
      expect(metadata.tags).toContain('url');
      expect(metadata.tags).toContain('link');
      expect(metadata.tags).toContain('helper');
      expect(metadata.tags).toContain('issue');
      expect(metadata.tags).toContain('batch');
    });
  });

  describe('execute', () => {
    describe('Валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если issueKeys не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку если issueKeys пустой массив', async () => {
        const result = await tool.execute({ issueKeys: [] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принять корректный массив ключей', async () => {
        const result = await tool.execute({ issueKeys: ['TEST-123'] });

        expect(result.isError).toBeUndefined();
      });
    });

    describe('Функциональность', () => {
      it('должен сформировать URL для одной задачи', async () => {
        const result = await tool.execute({ issueKeys: ['TEST-123'] });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            count: number;
            urls: Array<{
              issueKey: string;
              url: string;
              description: string;
            }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.count).toBe(1);
        expect(parsed.data.urls).toHaveLength(1);
        expect(parsed.data.urls[0]?.issueKey).toBe('TEST-123');
        expect(parsed.data.urls[0]?.url).toBe('https://tracker.yandex.ru/TEST-123');
        expect(parsed.data.urls[0]?.description).toContain('TEST-123');
      });

      it('должен сформировать URL для нескольких задач', async () => {
        const result = await tool.execute({ issueKeys: ['TEST-1', 'TEST-2', 'QUEUE-99'] });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            count: number;
            urls: Array<{
              issueKey: string;
              url: string;
            }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.count).toBe(3);
        expect(parsed.data.urls).toHaveLength(3);
        expect(parsed.data.urls[0]?.issueKey).toBe('TEST-1');
        expect(parsed.data.urls[0]?.url).toBe('https://tracker.yandex.ru/TEST-1');
        expect(parsed.data.urls[1]?.issueKey).toBe('TEST-2');
        expect(parsed.data.urls[1]?.url).toBe('https://tracker.yandex.ru/TEST-2');
        expect(parsed.data.urls[2]?.issueKey).toBe('QUEUE-99');
        expect(parsed.data.urls[2]?.url).toBe('https://tracker.yandex.ru/QUEUE-99');
      });

      it('должен включить description для каждого URL', async () => {
        const result = await tool.execute({ issueKeys: ['PROJECT-456'] });

        expect(result.isError).toBeUndefined();
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            urls: Array<{
              description: string;
            }>;
          };
        };
        expect(parsed.data.urls[0]?.description).toContain('Открыть задачу');
        expect(parsed.data.urls[0]?.description).toContain('PROJECT-456');
      });
    });

    describe('Логирование', () => {
      it('должен логировать формирование URL', async () => {
        await tool.execute({ issueKeys: ['TEST-1', 'TEST-2'] });

        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('URL сформированы'));
      });

      it('должен логировать количество задач', async () => {
        await tool.execute({ issueKeys: ['ABC-1', 'DEF-2', 'GHI-3'] });

        const logCall = vi.mocked(mockLogger.info).mock.calls[0];
        expect(logCall).toBeDefined();
        expect(logCall![0]).toContain('3 задач');
      });

      it('должен логировать ключи задач', async () => {
        await tool.execute({ issueKeys: ['QUEUE-1', 'QUEUE-2'] });

        const logCall = vi.mocked(mockLogger.info).mock.calls[0];
        expect(logCall).toBeDefined();
        expect(logCall![0]).toContain('QUEUE-1');
        expect(logCall![0]).toContain('QUEUE-2');
      });
    });
  });

  describe('METADATA', () => {
    it('должен иметь статические метаданные', () => {
      expect(IssueUrlTool.METADATA).toBeDefined();
      expect(IssueUrlTool.METADATA.name).toBe('get_issue_urls');
      expect(IssueUrlTool.METADATA.description).toBe('Получить URL задач в Яндекс.Трекере');
      expect(IssueUrlTool.METADATA.category).toBe(ToolCategory.URL_GENERATION);
      expect(IssueUrlTool.METADATA.tags).toContain('url');
      expect(IssueUrlTool.METADATA.isHelper).toBe(true);
    });
  });
});
