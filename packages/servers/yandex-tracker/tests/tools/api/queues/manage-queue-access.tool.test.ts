/**
 * Unit тесты для ManageQueueAccessTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManageQueueAccessTool } from '#tools/api/queues/manage-queue-access.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createQueuePermissionListFixture } from '#helpers/queue-permission.fixture.js';

describe('ManageQueueAccessTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: ManageQueueAccessTool;

  beforeEach(() => {
    mockTrackerFacade = {
      manageQueueAccess: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new ManageQueueAccessTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('manage_queue_access', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Управление доступом к очереди');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('queueId');
      expect(definition.inputSchema.required).toContain('role');
      expect(definition.inputSchema.required).toContain('subjects');
      expect(definition.inputSchema.required).toContain('action');
      expect(definition.inputSchema.properties?.['queueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['role']).toBeDefined();
      expect(definition.inputSchema.properties?.['subjects']).toBeDefined();
      expect(definition.inputSchema.properties?.['action']).toBeDefined();
    });

    it('должен включать параметр fields в inputSchema', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
      expect(definition.inputSchema.required).toContain('fields');
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если обязательные поля не указаны', async () => {
        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

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
          role: 'team-member',
          subjects: ['user1'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректной роли', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          role: 'invalid-role',
          subjects: ['user1'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать все валидные роли', async () => {
        const mockPermissions = createQueuePermissionListFixture(1);
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const roles = ['queue-lead', 'team-member', 'follower', 'access'] as const;

        for (const role of roles) {
          const result = await tool.execute({
            queueId: 'TEST',
            role,
            subjects: ['user1'],
            action: 'add',
            fields: ['id', 'key', 'name'],
          });

          expect(result.isError).toBeUndefined();
        }
      });

      it('должен вернуть ошибку для пустого массива subjects', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          role: 'team-member',
          subjects: [],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного action', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          role: 'team-member',
          subjects: ['user1'],
          action: 'invalid-action',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });
    });

    describe('управление доступом', () => {
      it('должен добавить одного пользователя в роль team-member', async () => {
        const mockPermissions = createQueuePermissionListFixture(1);
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'team-member',
          subjects: ['user1'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'TEST',
          accessData: {
            role: 'team-member',
            subjects: ['user1'],
            action: 'add',
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Управление доступом к очереди', {
          queueId: 'TEST',
          role: 'team-member',
          subjectsCount: 1,
          action: 'add',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Права доступа успешно обновлены', {
          queueId: 'TEST',
          action: 'add',
          subjectsCount: 1,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            queueId: string;
            role: string;
            action: string;
            subjectsProcessed: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.queueId).toBe('TEST');
        expect(parsed.data.role).toBe('team-member');
        expect(parsed.data.action).toBe('add');
        expect(parsed.data.subjectsProcessed).toBe(1);
      });

      it('должен удалить пользователя из роли', async () => {
        const mockPermissions = createQueuePermissionListFixture(0);
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'team-member',
          subjects: ['user1'],
          action: 'remove',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'TEST',
          accessData: {
            role: 'team-member',
            subjects: ['user1'],
            action: 'remove',
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Управление доступом к очереди', {
          queueId: 'TEST',
          role: 'team-member',
          subjectsCount: 1,
          action: 'remove',
        });
      });

      it('должен добавить нескольких пользователей', async () => {
        const mockPermissions = createQueuePermissionListFixture(3);
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'PROJ',
          role: 'follower',
          subjects: ['user1', 'user2', 'user3'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'PROJ',
          accessData: {
            role: 'follower',
            subjects: ['user1', 'user2', 'user3'],
            action: 'add',
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Управление доступом к очереди', {
          queueId: 'PROJ',
          role: 'follower',
          subjectsCount: 3,
          action: 'add',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            subjectsProcessed: number;
          };
        };
        expect(parsed.data.subjectsProcessed).toBe(3);
      });

      it('должен добавить пользователя в роль queue-lead', async () => {
        const mockPermissions = createQueuePermissionListFixture(1);
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'queue-lead',
          subjects: ['admin'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'TEST',
          accessData: {
            role: 'queue-lead',
            subjects: ['admin'],
            action: 'add',
          },
        });
      });

      it('должен управлять доступом для роли access', async () => {
        const mockPermissions = createQueuePermissionListFixture(2);
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'access',
          subjects: ['user1', 'user2'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'TEST',
          accessData: {
            role: 'access',
            subjects: ['user1', 'user2'],
            action: 'add',
          },
        });
      });

      it('должен вернуть обновленный список прав доступа', async () => {
        const mockPermissions = createQueuePermissionListFixture(2);
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'team-member',
          subjects: ['user1', 'user2'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            permissions: unknown[];
          };
        };
        expect(parsed.data.permissions).toHaveLength(2);
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "очередь не найдена"', async () => {
        const error = new Error('Queue not found');
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'NOTEXIST',
          role: 'team-member',
          subjects: ['user1'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при управлении доступом к очереди NOTEXIST');
        expect(parsed.error).toBe('Queue not found');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'team-member',
          subjects: ['user1'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Permission denied');
      });

      it('должен обработать ошибку "пользователь не найден"', async () => {
        const error = new Error('User not found');
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'team-member',
          subjects: ['invalid-user'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('User not found');
      });

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'team-member',
          subjects: ['user1'],
          action: 'add',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Network timeout');
      });

      it('должен обработать ошибку "попытка удалить последнего queue-lead"', async () => {
        const error = new Error('Cannot remove last queue lead');
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'TEST',
          role: 'queue-lead',
          subjects: ['last-lead'],
          action: 'remove',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Cannot remove last queue lead');
      });
    });
  });
});
