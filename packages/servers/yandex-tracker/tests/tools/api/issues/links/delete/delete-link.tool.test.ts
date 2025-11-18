/**
 * Unit тесты для DeleteLinkTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteLinkTool } from '@tools/api/issues/links/delete/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';

describe('DeleteLinkTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteLinkTool;

  beforeEach(() => {
    mockTrackerFacade = {
      deleteLink: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new DeleteLinkTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('delete_link', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Удалить связь между задачами');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'linkId']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['linkId']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({ linkId: 'link123' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр linkId', async () => {
      const result = await tool.execute({ issueId: 'TEST-123' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой issueId', async () => {
      const result = await tool.execute({ issueId: '', linkId: 'link123' });

      expect(result.isError).toBe(true);
    });

    it('должен отклонить пустой linkId', async () => {
      const result = await tool.execute({ issueId: 'TEST-123', linkId: '' });

      expect(result.isError).toBe(true);
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать deleteLink с корректными параметрами', async () => {
      vi.mocked(mockTrackerFacade.deleteLink).mockResolvedValue(undefined);

      await tool.execute({
        issueId: 'TEST-123',
        linkId: 'link456',
      });

      expect(mockTrackerFacade.deleteLink).toHaveBeenCalledWith('TEST-123', 'link456');
    });

    it('должен вернуть успешный результат при удалении связи', async () => {
      vi.mocked(mockTrackerFacade.deleteLink).mockResolvedValue(undefined);

      const result = await tool.execute({
        issueId: 'TEST-123',
        linkId: 'link789',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          success: boolean;
          message: string;
          issueId: string;
          linkId: string;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.message).toContain('удалена');
      expect(parsed.data.issueId).toBe('TEST-123');
      expect(parsed.data.linkId).toBe('link789');
    });

    it('должен обработать ошибку от facade', async () => {
      const error = new Error('Link deletion failed');
      vi.mocked(mockTrackerFacade.deleteLink).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        linkId: 'link999',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка');
    });

    it('должен логировать информацию об удалении связи', async () => {
      vi.mocked(mockTrackerFacade.deleteLink).mockResolvedValue(undefined);

      await tool.execute({
        issueId: 'TEST-456',
        linkId: 'link001',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Удаление связи link001 из задачи TEST-456');
      expect(mockLogger.info).toHaveBeenCalledWith('Связь link001 удалена из задачи TEST-456');
    });

    it('должен работать с разными форматами ключей задач', async () => {
      vi.mocked(mockTrackerFacade.deleteLink).mockResolvedValue(undefined);

      const result = await tool.execute({
        issueId: 'ABC-123',
        linkId: 'link002',
      });

      expect(result.isError).toBeUndefined();
      expect(mockTrackerFacade.deleteLink).toHaveBeenCalledWith('ABC-123', 'link002');
    });

    it('должен обработать ошибку 404 (связь не найдена)', async () => {
      const error = new Error('404 Not Found');
      vi.mocked(mockTrackerFacade.deleteLink).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-789',
        linkId: 'nonexistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка');
    });

    it('должен обработать ошибку доступа', async () => {
      const error = new Error('403 Forbidden');
      vi.mocked(mockTrackerFacade.deleteLink).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'RESTRICTED-1',
        linkId: 'link003',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка');
    });

    it('должен удалить несколько связей последовательно', async () => {
      vi.mocked(mockTrackerFacade.deleteLink).mockResolvedValue(undefined);

      await tool.execute({ issueId: 'TEST-100', linkId: 'link1' });
      await tool.execute({ issueId: 'TEST-100', linkId: 'link2' });
      await tool.execute({ issueId: 'TEST-100', linkId: 'link3' });

      expect(mockTrackerFacade.deleteLink).toHaveBeenCalledTimes(3);
      expect(mockTrackerFacade.deleteLink).toHaveBeenNthCalledWith(1, 'TEST-100', 'link1');
      expect(mockTrackerFacade.deleteLink).toHaveBeenNthCalledWith(2, 'TEST-100', 'link2');
      expect(mockTrackerFacade.deleteLink).toHaveBeenNthCalledWith(3, 'TEST-100', 'link3');
    });
  });
});
