/**
 * Unit тесты для CreateLinkTool (batch режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateLinkTool } from '#tools/api/issues/links/create/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createLinkFixture, createSubtaskLinkFixture } from '#helpers/link.fixture.js';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';

describe('CreateLinkTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateLinkTool;

  beforeEach(() => {
    mockTrackerFacade = {
      createLinksMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new CreateLinkTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('create_link', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Создать связи');
      expect(definition.description).toContain('Batch-режим');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['links', 'fields']);
      expect(definition.inputSchema.properties?.['links']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр links', async () => {
      const result = await tool.execute({
        fields: ['id', 'type'],
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать массив links с минимум одним элементом', async () => {
      const result = await tool.execute({
        links: [],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
    });

    it('должен валидировать структуру элементов массива links', async () => {
      const result = await tool.execute({
        links: [
          {
            issueId: 'TEST-1',
            // отсутствует relationship и targetIssue
          },
        ],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBe(true);
    });

    it('должен отклонить невалидный relationship', async () => {
      const result = await tool.execute({
        links: [
          {
            issueId: 'TEST-1',
            relationship: 'invalid_relationship',
            targetIssue: 'TEST-2',
          },
        ],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBe(true);
    });

    it('должен принять валидные relationship значения', async () => {
      const validRelationships = [
        'relates',
        'is duplicated by',
        'duplicates',
        'is subtask of',
        'has subtasks',
        'depends on',
        'is dependent by',
        'is epic of',
        'has epic',
      ];

      for (const relationship of validRelationships) {
        const mockBatchResult: BatchResult<string, LinkWithUnknownFields> = [
          {
            status: 'fulfilled',
            value: createLinkFixture(),
          },
        ];
        vi.mocked(mockTrackerFacade.createLinksMany).mockResolvedValue(mockBatchResult);

        const result = await tool.execute({
          links: [
            {
              issueId: 'TEST-1',
              relationship,
              targetIssue: 'TEST-2',
            },
          ],
          fields: ['id', 'type'],
        });

        expect(result.isError).toBeUndefined();
      }
    });
  });

  describe('Batch operations', () => {
    it('должен вызвать createLinksMany с корректными параметрами', async () => {
      const mockBatchResult: BatchResult<string, LinkWithUnknownFields> = [
        { status: 'fulfilled', value: createLinkFixture() },
        { status: 'fulfilled', value: createSubtaskLinkFixture() },
      ];
      vi.mocked(mockTrackerFacade.createLinksMany).mockResolvedValue(mockBatchResult);

      await tool.execute({
        links: [
          {
            issueId: 'TEST-1',
            relationship: 'relates',
            targetIssue: 'TEST-2',
          },
          {
            issueId: 'TEST-3',
            relationship: 'has subtasks',
            targetIssue: 'TEST-4',
          },
        ],
        fields: ['id', 'type', 'object'],
      });

      expect(mockTrackerFacade.createLinksMany).toHaveBeenCalledWith([
        {
          issueId: 'TEST-1',
          relationship: 'relates',
          targetIssue: 'TEST-2',
        },
        {
          issueId: 'TEST-3',
          relationship: 'has subtasks',
          targetIssue: 'TEST-4',
        },
      ]);
    });

    it('должен вернуть unified batch result format', async () => {
      const mockLink1 = createLinkFixture({ id: 'link-1' });
      const mockLink2 = createSubtaskLinkFixture({ id: 'link-2' });
      const mockBatchResult: BatchResult<string, LinkWithUnknownFields> = [
        { status: 'fulfilled', value: mockLink1 },
        { status: 'fulfilled', value: mockLink2 },
      ];
      vi.mocked(mockTrackerFacade.createLinksMany).mockResolvedValue(mockBatchResult);

      const result = await tool.execute({
        links: [
          {
            issueId: 'TEST-1',
            relationship: 'relates',
            targetIssue: 'TEST-2',
          },
          {
            issueId: 'TEST-3',
            relationship: 'has subtasks',
            targetIssue: 'TEST-4',
          },
        ],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          links: Array<{ issueId: string; linkId: string; link: LinkWithUnknownFields }>;
          errors: Array<{ issueId: string; error: string }>;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(2);
      expect(parsed.data.failed).toBe(0);
      expect(parsed.data.links).toHaveLength(2);
      expect(parsed.data.errors).toHaveLength(0);
      expect(parsed.data.fieldsReturned).toEqual(['id', 'type']);
    });

    it('должен обработать частичные ошибки', async () => {
      const mockLink = createLinkFixture({ id: 'link-1' });
      const mockBatchResult: BatchResult<string, LinkWithUnknownFields> = [
        { status: 'fulfilled', value: mockLink },
        { status: 'rejected', reason: new Error('Issue not found: TEST-99') },
      ];
      vi.mocked(mockTrackerFacade.createLinksMany).mockResolvedValue(mockBatchResult);

      const result = await tool.execute({
        links: [
          {
            issueId: 'TEST-1',
            relationship: 'relates',
            targetIssue: 'TEST-2',
          },
          {
            issueId: 'TEST-3',
            relationship: 'relates',
            targetIssue: 'TEST-99', // Эта задача не существует - вызовет ошибку
          },
        ],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          links: Array<{ issueId: string; linkId: string; link: LinkWithUnknownFields }>;
          errors: Array<{ issueId: string; error: string }>;
        };
      };
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(1);
      expect(parsed.data.failed).toBe(1);
      expect(parsed.data.links).toHaveLength(1);
      expect(parsed.data.errors).toHaveLength(1);
      expect(parsed.data.errors[0].error).toContain('Issue not found');
    });

    it('должен фильтровать поля для всех созданных связей', async () => {
      const mockLink1 = createLinkFixture({
        id: 'link-1',
        type: { id: 'relates', inward: 'связана с', outward: 'связана с' },
        object: { id: 'obj-1', key: 'TEST-2', display: 'Issue 2' },
        direction: 'outward',
      });
      const mockLink2 = createSubtaskLinkFixture({
        id: 'link-2',
        type: { id: 'subtask', inward: 'подзадача', outward: 'родительская' },
        object: { id: 'obj-2', key: 'TEST-4', display: 'Issue 4' },
        direction: 'outward',
      });
      const mockBatchResult: BatchResult<string, LinkWithUnknownFields> = [
        { status: 'fulfilled', value: mockLink1 },
        { status: 'fulfilled', value: mockLink2 },
      ];
      vi.mocked(mockTrackerFacade.createLinksMany).mockResolvedValue(mockBatchResult);

      const result = await tool.execute({
        links: [
          {
            issueId: 'TEST-1',
            relationship: 'relates',
            targetIssue: 'TEST-2',
          },
          {
            issueId: 'TEST-3',
            relationship: 'has subtasks',
            targetIssue: 'TEST-4',
          },
        ],
        fields: ['id', 'type'],
      });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: {
          links: Array<{ link: LinkWithUnknownFields }>;
        };
      };
      // Проверяем, что в результате только запрошенные поля
      expect(parsed.data.links[0].link.id).toBeDefined();
      expect(parsed.data.links[0].link.type).toBeDefined();
      // object и direction не должны быть в результате, т.к. не запрошены
      expect(parsed.data.links[0].link.object).toBeUndefined();
      expect(parsed.data.links[0].link.direction).toBeUndefined();
    });

    it('должен обработать общую ошибку от facade', async () => {
      const error = new Error('Batch operation failed');
      vi.mocked(mockTrackerFacade.createLinksMany).mockRejectedValue(error);

      const result = await tool.execute({
        links: [
          {
            issueId: 'TEST-1',
            relationship: 'relates',
            targetIssue: 'TEST-2',
          },
        ],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка');
    });

    it('должен работать с разными типами связей в одном batch', async () => {
      const mockBatchResult: BatchResult<string, LinkWithUnknownFields> = [
        { status: 'fulfilled', value: createLinkFixture({ id: 'link-1' }) },
        { status: 'fulfilled', value: createSubtaskLinkFixture({ id: 'link-2' }) },
        {
          status: 'fulfilled',
          value: createLinkFixture({
            id: 'link-3',
            type: { id: 'depends', inward: 'зависит от', outward: 'блокирует' },
          }),
        },
      ];
      vi.mocked(mockTrackerFacade.createLinksMany).mockResolvedValue(mockBatchResult);

      const result = await tool.execute({
        links: [
          {
            issueId: 'TEST-1',
            relationship: 'relates',
            targetIssue: 'TEST-2',
          },
          {
            issueId: 'TEST-3',
            relationship: 'has subtasks',
            targetIssue: 'TEST-4',
          },
          {
            issueId: 'TEST-5',
            relationship: 'depends on',
            targetIssue: 'TEST-6',
          },
        ],
        fields: ['id', 'type'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: {
          total: number;
          successful: number;
          links: Array<{ link: LinkWithUnknownFields }>;
        };
      };
      expect(parsed.data.total).toBe(3);
      expect(parsed.data.successful).toBe(3);
    });
  });
});
