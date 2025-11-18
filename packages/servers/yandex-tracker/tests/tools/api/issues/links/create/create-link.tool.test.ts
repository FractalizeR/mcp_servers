/**
 * Unit тесты для CreateLinkTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateLinkTool } from '@tools/api/issues/links/create/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import {
  createLinkFixture,
  createSubtaskLinkFixture,
} from '../../../../../helpers/link.fixture.js';

describe('CreateLinkTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateLinkTool;

  beforeEach(() => {
    mockTrackerFacade = {
      createLink: vi.fn(),
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
      expect(definition.description).toContain('Создать связь между задачами');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'relationship', 'targetIssue']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['relationship']).toBeDefined();
      expect(definition.inputSchema.properties?.['targetIssue']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({
        relationship: 'relates',
        targetIssue: 'TEST-456',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.data.message).toContain('валидации');
    });

    it('должен требовать параметр relationship', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        targetIssue: 'TEST-456',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.data.message).toContain('валидации');
    });

    it('должен требовать параметр targetIssue', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        relationship: 'relates',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.data.message).toContain('валидации');
    });

    it('должен отклонить невалидный relationship', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        relationship: 'invalid_relationship',
        targetIssue: 'TEST-456',
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
        const mockLink = createLinkFixture();
        vi.mocked(mockTrackerFacade.createLink).mockResolvedValue(mockLink);

        const result = await tool.execute({
          issueId: 'TEST-123',
          relationship,
          targetIssue: 'TEST-456',
        });

        expect(result.isError).toBeUndefined();
      }
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать createLink с корректными параметрами', async () => {
      const mockLink = createSubtaskLinkFixture();
      vi.mocked(mockTrackerFacade.createLink).mockResolvedValue(mockLink);

      await tool.execute({
        issueId: 'TEST-123',
        relationship: 'has subtasks',
        targetIssue: 'TEST-456',
      });

      expect(mockTrackerFacade.createLink).toHaveBeenCalledWith('TEST-123', {
        relationship: 'has subtasks',
        issue: 'TEST-456',
      });
    });

    it('должен вернуть успешный результат при создании связи', async () => {
      const mockLink = createSubtaskLinkFixture();
      vi.mocked(mockTrackerFacade.createLink).mockResolvedValue(mockLink);

      const result = await tool.execute({
        issueId: 'TEST-123',
        relationship: 'has subtasks',
        targetIssue: 'TEST-456',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
        link: {
          id: string;
          type: { id: string };
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.message).toContain('Связь создана');
      expect(parsed.data.link.id).toBe(mockLink.id);
      expect(parsed.data.link.type.id).toBe(mockLink.type.id);
    });

    it('должен создать связь типа relates', async () => {
      const mockLink = createLinkFixture({
        type: {
          id: 'relates',
          inward: 'связана с',
          outward: 'связана с',
        },
      });
      vi.mocked(mockTrackerFacade.createLink).mockResolvedValue(mockLink);

      const result = await tool.execute({
        issueId: 'TEST-100',
        relationship: 'relates',
        targetIssue: 'TEST-200',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        link: { type: { id: string } };
      };
      expect(parsed.data.link.type.id).toBe('relates');
    });

    it('должен создать связь типа depends on', async () => {
      const mockLink = createLinkFixture({
        type: {
          id: 'depends',
          inward: 'зависит от',
          outward: 'блокирует',
        },
      });
      vi.mocked(mockTrackerFacade.createLink).mockResolvedValue(mockLink);

      const result = await tool.execute({
        issueId: 'TEST-300',
        relationship: 'depends on',
        targetIssue: 'TEST-400',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        link: { type: { id: string } };
      };
      expect(parsed.data.link.type.id).toBe('depends');
    });

    it('должен обработать ошибку от facade', async () => {
      const error = new Error('Link creation failed');
      vi.mocked(mockTrackerFacade.createLink).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        relationship: 'relates',
        targetIssue: 'TEST-456',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка');
    });

    it('должен логировать информацию о создании связи', async () => {
      const mockLink = createSubtaskLinkFixture();
      vi.mocked(mockTrackerFacade.createLink).mockResolvedValue(mockLink);

      await tool.execute({
        issueId: 'TEST-123',
        relationship: 'has subtasks',
        targetIssue: 'TEST-456',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Создание связи: TEST-123 has subtasks TEST-456'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Связь создана'));
    });

    it('должен работать с ID задачи вместо ключа', async () => {
      const mockLink = createSubtaskLinkFixture();
      vi.mocked(mockTrackerFacade.createLink).mockResolvedValue(mockLink);

      const result = await tool.execute({
        issueId: 'abc123def456',
        relationship: 'relates',
        targetIssue: 'xyz789',
      });

      expect(result.isError).toBeUndefined();
      expect(mockTrackerFacade.createLink).toHaveBeenCalledWith('abc123def456', {
        relationship: 'relates',
        issue: 'xyz789',
      });
    });
  });
});
