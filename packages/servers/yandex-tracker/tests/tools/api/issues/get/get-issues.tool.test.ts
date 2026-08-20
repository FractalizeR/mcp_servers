/**
 * Unit тесты для GetIssuesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createQueueRef } from '#helpers/common-fixtures.js';
import { GetIssuesTool } from '#tools/api/issues/get/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('GetIssuesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetIssuesTool;

  const mockIssue1: IssueWithUnknownFields = {
    id: '1',
    key: 'QUEUE-123',
    summary: 'Test Issue 1',
    description: 'Test Description 1',
    queue: createQueueRef({
      id: '1',
      key: 'QUEUE',
      display: 'Test Queue',
    }),
    status: {
      id: '1',
      key: 'open',
      display: 'Open',
    },
    assignee: {
      self: 'https://api.tracker.yandex.net/v3/users/user1',
      id: 'user1',
      display: 'User One',
    },
    createdBy: {
      self: 'https://api.tracker.yandex.net/v3/users/creator',
      id: 'creator',
      display: 'Creator',
    },
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-02T12:00:00Z',
  };

  const mockIssue2: IssueWithUnknownFields = {
    id: '2',
    key: 'QUEUE-456',
    summary: 'Test Issue 2',
    description: 'Test Description 2',
    queue: createQueueRef({
      id: '1',
      key: 'QUEUE',
      display: 'Test Queue',
    }),
    status: {
      id: '2',
      key: 'closed',
      display: 'Closed',
    },
    createdBy: {
      self: 'https://api.tracker.yandex.net/v3/users/creator2',
      id: 'creator2',
      display: 'Creator 2',
    },
    createdAt: '2025-01-03T10:00:00Z',
    updatedAt: '2025-01-04T12:00:00Z',
  };

  beforeEach(() => {
    mockTrackerFacade = {
      getIssues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetIssuesTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_issues', MCP_TOOL_PREFIX));
      // После миграции на getParamsSchema() description берется из METADATA
      expect(definition.description).toContain('Получить задачи');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueIds', 'fields']);
      expect(definition.inputSchema.properties?.['issueIds']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если issueIds не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку если issueIds пустой массив', async () => {
        const result = await tool.execute({ issueIds: [], fields: STANDARD_ISSUE_FIELDS });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного формата ключа', async () => {
        const result = await tool.execute({
          issueIds: ['QUEUE-123', 'invalid-key'],
          fields: STANDARD_ISSUE_FIELDS,
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });
    });

    describe('получение задач', () => {
      it('должен получить одну задачу с фильтрацией полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
        ]);

        const result = await tool.execute({
          issueIds: ['QUEUE-123'],
          fields: STANDARD_ISSUE_FIELDS,
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getIssues).toHaveBeenCalledWith(['QUEUE-123']);
        expect(mockLogger.info).toHaveBeenCalled();

        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          data: {
            total: number;
            successful: Array<{ issueId: string; issue: IssueWithUnknownFields }>;
            failed: Array<{ issueId: string; error: string }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.total).toBe(1);
        expect(parsed.data.successful).toHaveLength(1);
        expect(parsed.data.failed).toHaveLength(0);
        expect(parsed.data.successful[0]?.issueId).toBe('QUEUE-123');
      });

      it('должен получить несколько задач с фильтрацией полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
          { status: 'fulfilled', value: mockIssue2, key: 'QUEUE-456', index: 1 },
        ]);

        const result = await tool.execute({
          issueIds: ['QUEUE-123', 'QUEUE-456'],
          fields: STANDARD_ISSUE_FIELDS,
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getIssues).toHaveBeenCalledWith(['QUEUE-123', 'QUEUE-456']);

        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          data: {
            total: number;
            successful: Array<{ issueId: string; issue: IssueWithUnknownFields }>;
            failed: Array<{ issueId: string; error: string }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.total).toBe(2);
        expect(parsed.data.successful).toHaveLength(2);
        expect(parsed.data.failed).toHaveLength(0);
        expect(parsed.data.successful[0]?.issueId).toBe('QUEUE-123');
        expect(parsed.data.successful[1]?.issueId).toBe('QUEUE-456');
      });

      it('должен получить задачи с фильтрацией полей', async () => {
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
        ]);

        const result = await tool.execute({
          issueIds: ['QUEUE-123'],
          fields: ['key', 'summary'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          data: {
            successful: Array<{ issueId: string; issue: Partial<IssueWithUnknownFields> }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.successful[0]?.issue).toEqual({
          key: 'QUEUE-123',
          summary: 'Test Issue 1',
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать частичные ошибки', async () => {
        const apiError = new Error('API Error: Issue not found');
        vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
          { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
          { status: 'rejected', reason: apiError, key: 'QUEUE-999', index: 1 },
        ]);

        const result = await tool.execute({
          issueIds: ['QUEUE-123', 'QUEUE-999'],
          fields: STANDARD_ISSUE_FIELDS,
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          data: {
            successful: unknown[];
            failed: Array<{ issueId: string; error: string }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.successful).toHaveLength(1);
        expect(parsed.data.failed).toHaveLength(1);
        expect(parsed.data.failed[0]?.issueId).toBe('QUEUE-999');
      });

      it('должен обработать критическую ошибку facade', async () => {
        const criticalError = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.getIssues).mockRejectedValue(criticalError);

        const result = await tool.execute({
          issueIds: ['QUEUE-123'],
          fields: STANDARD_ISSUE_FIELDS,
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении задач');
        expect(parsed.error).toBe('Network timeout');
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Контракт (plan_tool_contract_unification)', () => {
    it('successful — пустой массив, failed — все элементы при полном отказе batch', async () => {
      const apiError = new Error('Not found');
      vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
        { status: 'rejected', reason: apiError, key: 'QUEUE-1', index: 0 },
        { status: 'rejected', reason: apiError, key: 'QUEUE-2', index: 1 },
      ]);

      const result = await tool.execute({
        issueIds: ['QUEUE-1', 'QUEUE-2'],
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        data: { total: number; successful: unknown[]; failed: unknown[] };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(Array.isArray(parsed.data.successful)).toBe(true);
      expect(parsed.data.successful).toHaveLength(0);
      expect(parsed.data.failed).toHaveLength(2);
    });

    it('принимает идентификатор задачи в виде внутреннего id (24-символьный hex), не только ключа', async () => {
      const internalId = '6a86a4f94f009850c7186c67';
      vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
        { status: 'fulfilled', value: mockIssue1, key: internalId, index: 0 },
      ]);

      const result = await tool.execute({
        issueIds: [internalId],
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      expect(mockTrackerFacade.getIssues).toHaveBeenCalledWith([internalId]);
    });

    it('неверное/незнакомое имя поля → warning с success:true, а не ошибка валидации', async () => {
      vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
        { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
      ]);

      const result = await tool.execute({
        issueIds: ['QUEUE-123'],
        fields: ['key', 'totallyBogusFieldName'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        warnings?: Array<{ code: string; message: string; details?: { fields: string[] } }>;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings?.[0]?.code).toBe('FIELDS_WITHOUT_VALUE');
      expect(parsed.warnings?.[0]?.details?.fields).toEqual(['totallyBogusFieldName']);
    });

    it('поле, пустое лишь у части задач, — предупреждения НЕТ (шумный warning не создаётся)', async () => {
      // mockIssue1 несёт assignee, mockIssue2 — нет: путь дал значение хотя
      // бы у одного элемента, значит по правилу детектора он НЕ "без значения".
      vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
        { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
        { status: 'fulfilled', value: mockIssue2, key: 'QUEUE-456', index: 1 },
      ]);

      const result = await tool.execute({
        issueIds: ['QUEUE-123', 'QUEUE-456'],
        fields: ['key', 'assignee'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        warnings?: unknown[];
      };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toBeUndefined();
    });

    it('ответ без предупреждений не содержит ключ warnings ни в content[0].text, ни в structuredContent', async () => {
      vi.mocked(mockTrackerFacade.getIssues).mockResolvedValue([
        { status: 'fulfilled', value: mockIssue1, key: 'QUEUE-123', index: 0 },
      ]);

      const result = await tool.execute({
        issueIds: ['QUEUE-123'],
        fields: ['key'],
      });

      expect(getTextContent(result)).not.toContain('"warnings"');
      expect(result['structuredContent']).not.toHaveProperty('warnings');
    });
  });
});
