/**
 * Unit тесты для ManageQueueAccessTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManageQueueAccessTool } from '#tools/api/queues/manage-queue-access.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import {
  createQueuePermissionsFixture,
  createVersionOnlyQueuePermissionsFixture,
} from '#helpers/queue-permission.fixture.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

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
      expect(definition.inputSchema.required).toContain('permission');
      expect(definition.inputSchema.required).toContain('subjectKind');
      expect(definition.inputSchema.required).toContain('subjects');
      expect(definition.inputSchema.required).toContain('action');
      expect(definition.inputSchema.properties?.['queueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['permission']).toBeDefined();
      expect(definition.inputSchema.properties?.['subjectKind']).toBeDefined();
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
        const result = await tool.execute({ fields: ['self', 'version'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого queueId', async () => {
        const result = await tool.execute({
          queueId: '',
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного разрешения', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'queue-lead',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного вида субъекта', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'teams',
          subjects: ['user1'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать все пять разрешений и три вида субъекта', async () => {
        const mockPermissions = createQueuePermissionsFixture();
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const permissions = ['create', 'write', 'read', 'grant', 'deny'] as const;
        for (const permission of permissions) {
          const result = await tool.execute({
            queueId: 'TEST',
            permission,
            subjectKind: 'users',
            subjects: ['user1'],
            action: 'add',
            fields: ['self', 'version'],
          });

          expect(result.isError).toBeUndefined();
        }

        const subjectKinds: readonly ['users' | 'groups' | 'roles', (string | number)[]][] = [
          ['users', ['user1']],
          ['groups', [42]],
          ['roles', ['assignee']],
        ];
        for (const [subjectKind, subjects] of subjectKinds) {
          const result = await tool.execute({
            queueId: 'TEST',
            permission: 'write',
            subjectKind,
            subjects,
            action: 'add',
            fields: ['self', 'version'],
          });

          expect(result.isError).toBeUndefined();
        }
      });

      it('deny + roles отклоняется схемой до HTTP-запроса', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'deny',
          subjectKind: 'roles',
          subjects: ['assignee'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
        expect(mockTrackerFacade.manageQueueAccess).not.toHaveBeenCalled();
      });

      it('роль вне справочника (author/assignee/follower/access) отклоняется схемой', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'roles',
          subjects: ['queue-lead'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
        expect(mockTrackerFacade.manageQueueAccess).not.toHaveBeenCalled();
      });

      it('группа-строка вместо числа отклоняется схемой', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'groups',
          subjects: ['42'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого массива subjects', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'users',
          subjects: [],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного action', async () => {
        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'invalid-action',
          fields: ['self', 'version'],
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

    describe('управление доступом', () => {
      it('должен добавить одного пользователя в разрешение write', async () => {
        const mockPermissions = createQueuePermissionsFixture();
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'TEST',
          accessData: {
            permission: 'write',
            subjectKind: 'users',
            subjects: ['user1'],
            action: 'add',
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Управление доступом к очереди', {
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'users',
          subjectsCount: 1,
          action: 'add',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Права доступа успешно обновлены', {
          queueId: 'TEST',
          action: 'add',
          subjectsCount: 1,
        });

        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          data: {
            queueId: string;
            permission: string;
            subjectKind: string;
            action: string;
            subjectsSent: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.queueId).toBe('TEST');
        expect(parsed.data.permission).toBe('write');
        expect(parsed.data.subjectKind).toBe('users');
        expect(parsed.data.action).toBe('add');
        expect(parsed.data.subjectsSent).toBe(1);
      });

      it('должен удалить пользователя из разрешения', async () => {
        const mockPermissions = createVersionOnlyQueuePermissionsFixture();
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'remove',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'TEST',
          accessData: {
            permission: 'write',
            subjectKind: 'users',
            subjects: ['user1'],
            action: 'remove',
          },
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Управление доступом к очереди', {
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'users',
          subjectsCount: 1,
          action: 'remove',
        });
      });

      it('должен добавить несколько групп числами', async () => {
        const mockPermissions = createQueuePermissionsFixture();
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'PROJ',
          permission: 'read',
          subjectKind: 'groups',
          subjects: [1, 2, 3],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'PROJ',
          accessData: {
            permission: 'read',
            subjectKind: 'groups',
            subjects: [1, 2, 3],
            action: 'add',
          },
        });

        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          data: {
            subjectsSent: number;
          };
        };
        expect(parsed.data.subjectsSent).toBe(3);
      });

      it('должен управлять доступом для разрешения grant с ролью', async () => {
        const mockPermissions = createQueuePermissionsFixture();
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'grant',
          subjectKind: 'roles',
          subjects: ['author'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.manageQueueAccess).toHaveBeenCalledWith({
          queueId: 'TEST',
          accessData: {
            permission: 'grant',
            subjectKind: 'roles',
            subjects: ['author'],
            action: 'add',
          },
        });
      });

      it('должен вернуть права доступа объектом, ключёванным разрешением (не массивом)', async () => {
        const mockPermissions = createQueuePermissionsFixture();
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1', 'user2'],
          action: 'add',
          fields: ['self', 'version', 'write.users.display'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          data: {
            permissions: {
              self: string;
              version: number;
              write?: { users?: Array<{ display: string }> };
            };
          };
        };
        expect(Array.isArray(parsed.data.permissions)).toBe(false);
        expect(parsed.data.permissions.self).toBeDefined();
        expect(parsed.data.permissions.version).toBeDefined();
        expect(parsed.data.permissions.write?.users?.[0]?.display).toBeDefined();
      });

      it('переживает ответ без единого разрешения ({self, version})', async () => {
        const mockPermissions = createVersionOnlyQueuePermissionsFixture();
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockResolvedValue(mockPermissions);

        const result = await tool.execute({
          queueId: 'TEST',
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBeUndefined();
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "очередь не найдена"', async () => {
        const error = new Error('Queue not found');
        vi.mocked(mockTrackerFacade.manageQueueAccess).mockRejectedValue(error);

        const result = await tool.execute({
          queueId: 'NOTEXIST',
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
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
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
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
          permission: 'write',
          subjectKind: 'users',
          subjects: ['invalid-user'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
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
          permission: 'write',
          subjectKind: 'users',
          subjects: ['user1'],
          action: 'add',
          fields: ['self', 'version'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Network timeout');
      });
    });
  });
});
