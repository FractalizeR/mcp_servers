/**
 * Unit тесты для GetIssueLinksTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetIssueLinksTool } from '@tools/api/issues/links/get/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import {
  createLinkListFixture,
  createSubtaskLinkFixture,
  createRelatesLinkFixture,
} from '../../../../../helpers/link.fixture.js';

describe('GetIssueLinksTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetIssueLinksTool;

  beforeEach(() => {
    mockTrackerFacade = {
      getIssueLinks: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetIssueLinksTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_issue_links', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Получить связи задачи');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой issueId', async () => {
      const result = await tool.execute({ issueId: '' });

      expect(result.isError).toBe(true);
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать getIssueLinks с корректным параметром', async () => {
      const mockLinks = createLinkListFixture(3);
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue(mockLinks);

      await tool.execute({ issueId: 'TEST-123' });

      expect(mockTrackerFacade.getIssueLinks).toHaveBeenCalledWith('TEST-123');
    });

    it('должен вернуть успешный результат со списком связей', async () => {
      const mockLinks = createLinkListFixture(2);
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue(mockLinks);

      const result = await tool.execute({ issueId: 'TEST-123' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        issueId: string;
        linksCount: number;
        links: Array<{
          id: string;
          type: { id: string };
        }>;
      };
      expect(parsed.issueId).toBe('TEST-123');
      expect(parsed.linksCount).toBe(2);
      expect(parsed.links).toHaveLength(2);
    });

    it('должен вернуть пустой массив когда нет связей', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([]);

      const result = await tool.execute({ issueId: 'TEST-456' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        linksCount: number;
        links: unknown[];
      };
      expect(parsed.linksCount).toBe(0);
      expect(parsed.links).toEqual([]);
    });

    it('должен включить все поля связи в ответ', async () => {
      const mockLinks = [createSubtaskLinkFixture()];
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue(mockLinks);

      const result = await tool.execute({ issueId: 'TEST-100' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        links: Array<{
          id: string;
          type: { id: string; inward: string; outward: string };
          direction: string;
          linkedIssue: { id: string; key: string; display: string };
          createdBy: { id: string; display: string };
          createdAt: string;
        }>;
      };
      expect(parsed.links[0]).toHaveProperty('id');
      expect(parsed.links[0]).toHaveProperty('type');
      expect(parsed.links[0]).toHaveProperty('direction');
      expect(parsed.links[0]).toHaveProperty('linkedIssue');
      expect(parsed.links[0]).toHaveProperty('createdBy');
      expect(parsed.links[0]).toHaveProperty('createdAt');
    });

    it('должен обработать связи разных типов', async () => {
      const mockLinks = [
        createSubtaskLinkFixture({ id: 'link1' }),
        createRelatesLinkFixture({ id: 'link2' }),
      ];
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue(mockLinks);

      const result = await tool.execute({ issueId: 'TEST-200' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        links: Array<{ type: { id: string } }>;
      };
      expect(parsed.links[0]!.type.id).toBe('subtask');
      expect(parsed.links[1]!.type.id).toBe('relates');
    });

    it('должен включить updatedBy и updatedAt если они есть', async () => {
      const mockLinks = [
        createSubtaskLinkFixture({
          updatedBy: {
            self: 'https://api.tracker.yandex.net/v3/users/123',
            id: '123',
            display: 'Updater',
          },
          updatedAt: '2025-01-19T12:00:00.000+0000',
        }),
      ];
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue(mockLinks);

      const result = await tool.execute({ issueId: 'TEST-300' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        links: Array<{
          updatedBy?: { id: string; display: string };
          updatedAt?: string;
        }>;
      };
      expect(parsed.links[0]).toHaveProperty('updatedBy');
      expect(parsed.links[0]).toHaveProperty('updatedAt');
      expect(parsed.links[0]!.updatedBy?.id).toBe('123');
    });

    it('должен обработать ошибку от facade', async () => {
      const error = new Error('Failed to get links');
      vi.mocked(mockTrackerFacade.getIssueLinks).mockRejectedValue(error);

      const result = await tool.execute({ issueId: 'TEST-123' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка');
    });

    it('должен логировать информацию о получении связей', async () => {
      const mockLinks = createLinkListFixture(5);
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue(mockLinks);

      await tool.execute({ issueId: 'TEST-789' });

      expect(mockLogger.info).toHaveBeenCalledWith('Получение связей задачи TEST-789');
      expect(mockLogger.info).toHaveBeenCalledWith('Получено 5 связей для задачи TEST-789');
    });

    it('должен работать с разными форматами ключей задач', async () => {
      const mockLinks = createLinkListFixture(1);
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue(mockLinks);

      const result = await tool.execute({ issueId: 'ABC-123' });

      expect(result.isError).toBeUndefined();
      expect(mockTrackerFacade.getIssueLinks).toHaveBeenCalledWith('ABC-123');
    });

    it('должен обработать большое количество связей', async () => {
      const mockLinks = createLinkListFixture(100);
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue(mockLinks);

      const result = await tool.execute({ issueId: 'TEST-EPIC' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        linksCount: number;
      };
      expect(parsed.linksCount).toBe(100);
    });
  });
});
