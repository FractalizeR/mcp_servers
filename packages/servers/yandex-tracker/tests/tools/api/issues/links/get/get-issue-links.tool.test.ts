/**
 * Unit тесты для GetIssueLinksTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetIssueLinksTool } from '#tools/api/issues/links/get/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createLinkListFixture } from '#helpers/link.fixture.js';

describe('GetIssueLinksTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetIssueLinksTool;

  const mockLinks: LinkWithUnknownFields[] = createLinkListFixture(3);

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
    it('должен иметь корректное имя yandex_tracker_get_issue_links', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_issue_links', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(GetIssueLinksTool.METADATA.category).toBe('issues');
      expect(GetIssueLinksTool.METADATA.subcategory).toBe('links');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Получить связи');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueIds', 'fields']);
      expect(definition.inputSchema.properties?.['issueIds']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueIds', async () => {
      const result = await tool.execute({ fields: ['id', 'type'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр fields', async () => {
      const result = await tool.execute({ issueIds: ['TEST-123'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив issueIds', async () => {
      const result = await tool.execute({ issueIds: [], fields: ['id', 'type'] });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockLinks,
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать getIssueLinks с корректными параметрами', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockLinks,
        },
      ]);

      await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'type'],
      });

      expect(mockTrackerFacade.getIssueLinks).toHaveBeenCalledWith(['TEST-123']);
    });

    it('должен вернуть unified batch result', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockLinks,
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{
            issueId: string;
            links: LinkWithUnknownFields[];
            count: number;
          }>;
          failed: Array<{ issueId: string; error: string }>;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.failed).toHaveLength(0);
      expect(parsed.data.successful[0].issueId).toBe('TEST-123');
      expect(parsed.data.successful[0].count).toBe(3);
      expect(parsed.data.fieldsReturned).toEqual(['id', 'type']);
    });

    it('должен вернуть пустой массив для задачи без связей', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: [],
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{
            count: number;
          }>;
          failed: unknown[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.failed).toHaveLength(0);
      expect(parsed.data.successful[0].count).toBe(0);
    });

    it('должен обработать batch результаты для нескольких задач', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockLinks,
        },
        {
          status: 'fulfilled',
          key: 'TEST-456',
          index: 1,
          value: [],
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{
            issueId: string;
            count: number;
          }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(2);
      expect(parsed.data.successful[0].issueId).toBe('TEST-123');
      expect(parsed.data.successful[0].count).toBe(3);
      expect(parsed.data.successful[1].issueId).toBe('TEST-456');
      expect(parsed.data.successful[1].count).toBe(0);
    });

    it('должен фильтровать поля в результатах', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockLinks,
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          successful: Array<{
            links: Array<{
              id: string;
              type: unknown;
            }>;
          }>;
          fieldsReturned: string[];
        };
      };
      expect(parsed.data.successful[0].links[0]).toHaveProperty('id');
      expect(parsed.data.successful[0].links[0]).toHaveProperty('type');
      expect(parsed.data.successful[0].links[0]).not.toHaveProperty('createdBy');
      expect(parsed.data.fieldsReturned).toEqual(['id', 'type']);
    });
  });

  describe('Logging', () => {
    it('должен логировать начало batch операции', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockLinks,
        },
      ]);

      await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'type'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Получение связей'),
        expect.objectContaining({
          itemsCount: 1,
          fields: 2,
        })
      );
    });

    it('должен логировать результаты batch операции', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockLinks,
        },
        {
          status: 'fulfilled',
          key: 'TEST-456',
          index: 1,
          value: [],
        },
      ]);

      await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'type'],
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Связи задач получены'),
        expect.objectContaining({
          successful: 2,
          failed: 0,
          fieldsCount: 2,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от facade', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.getIssueLinks).mockRejectedValue(error);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении связей задач');
    });

    it('должен обработать частичные ошибки (partial failures)', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockLinks,
        },
        {
          status: 'rejected',
          key: 'TEST-456',
          index: 1,
          reason: new Error('Not found'),
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: unknown[];
          failed: unknown[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.failed).toHaveLength(1);
    });

    it('должен обработать полный провал всех запросов', async () => {
      vi.mocked(mockTrackerFacade.getIssueLinks).mockResolvedValue([
        {
          status: 'rejected',
          key: 'TEST-123',
          index: 0,
          reason: new Error('Not found'),
        },
        {
          status: 'rejected',
          key: 'TEST-456',
          index: 1,
          reason: new Error('Access denied'),
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: unknown[];
          failed: unknown[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(0);
      expect(parsed.data.failed).toHaveLength(2);
    });
  });
});
