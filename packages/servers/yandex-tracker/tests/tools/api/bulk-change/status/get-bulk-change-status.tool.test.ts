/**
 * Unit тесты для GetBulkChangeStatusTool
 *
 * Единственный участок ветки «типы сущностей под реальную форму API», у которого
 * изменилось рантайм-поведение, и единственный, чью форму нельзя снять живой
 * пробой (создание bulk-операции — запись в боевой сервис). Отсюда покрытие
 * маппинга полей и всех веток статусного сообщения, включая нераспознанный статус.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetBulkChangeStatusTool } from '#tools/api/bulk-change/status/index.js';
import { GetBulkChangeStatusOutputDataSchema } from '#tools/api/bulk-change/status/get-bulk-change-status.schema.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';
import { createUserRef } from '#helpers/common-fixtures.js';

type ToolData = Record<string, unknown>;

function parseData(result: { content: unknown }): ToolData {
  const parsed = JSON.parse(getTextContent(result as never)) as {
    success: boolean;
    data: ToolData;
  };
  expect(parsed.success).toBe(true);
  return parsed.data;
}

function getWarnings(result: { content: unknown }): unknown[] | undefined {
  return (result as { structuredContent?: { warnings?: unknown[] } }).structuredContent?.warnings;
}

function createMockFacade(): YandexTrackerFacade {
  return { getBulkChangeStatus: vi.fn() } as unknown as YandexTrackerFacade;
}

function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger;
}

const fullOperation: BulkChangeOperationWithUnknownFields = {
  id: 'op-1',
  self: 'https://api.tracker.yandex.net/v3/bulkchange/op-1',
  status: 'COMPLETE',
  statusText: 'Массовое изменение выполнено',
  createdBy: createUserRef(),
  createdAt: '2024-06-26T19:00:47.451+0000',
  executionChunkPercent: 100,
  executionIssuePercent: 100,
  totalIssues: 24,
  totalCompletedIssues: 24,
};

describe('GetBulkChangeStatusTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetBulkChangeStatusTool;

  beforeEach(() => {
    mockTrackerFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new GetBulkChangeStatusTool(mockTrackerFacade, mockLogger);
  });

  it('требует operationId', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(true);
  });

  it('требует fields', async () => {
    const result = await tool.execute({ operationId: 'op-1' });

    expect(result.isError).toBe(true);
  });

  describe('фильтрация поддерева operation по fields', () => {
    it('переносит поля ответа API в поддерево operation, отфильтрованное по fields', async () => {
      vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue(fullOperation);

      const data = parseData(
        await tool.execute({
          operationId: 'op-1',
          fields: [
            'status',
            'statusText',
            'totalIssues',
            'totalCompletedIssues',
            'executionChunkPercent',
            'executionIssuePercent',
          ],
        })
      );

      expect(data).toMatchObject({
        operationId: 'op-1',
        operation: {
          status: 'COMPLETE',
          statusText: 'Массовое изменение выполнено',
          totalIssues: 24,
          totalCompletedIssues: 24,
          executionChunkPercent: 100,
          executionIssuePercent: 100,
        },
      });
      expect(GetBulkChangeStatusOutputDataSchema.safeParse(data).success).toBe(true);
    });

    // Регрессионный тест для находки 6 живого прогона 2026-08-20: createdBy
    // безусловно тащил cloudUid/passportUid — теперь он попадает в ответ,
    // только если явно запрошен через fields, и только то, что запрошено.
    it('не отдаёт createdBy целиком, если поле не запрошено; отдаёт только запрошенное', async () => {
      vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue(fullOperation);

      const withoutCreatedBy = parseData(
        await tool.execute({ operationId: 'op-1', fields: ['status'] })
      );
      expect(withoutCreatedBy['operation']).not.toHaveProperty('createdBy');

      const withDisplayOnly = parseData(
        await tool.execute({ operationId: 'op-1', fields: ['createdBy.display'] })
      );
      const operation = withDisplayOnly['operation'] as Record<string, unknown>;
      expect(operation['createdBy']).toEqual({ display: fullOperation.createdBy?.display });
    });

    it('не подставляет отсутствующие опциональные поля и предупреждает о полях без значения', async () => {
      vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue({
        id: 'op-2',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op-2',
        status: 'CREATED',
      });

      const result = await tool.execute({
        operationId: 'op-2',
        fields: ['status', 'statusText', 'totalIssues', 'executionIssuePercent', 'createdBy'],
      });
      const data = parseData(result);
      const operation = data['operation'] as Record<string, unknown>;

      for (const key of ['statusText', 'totalIssues', 'executionIssuePercent', 'createdBy']) {
        expect(operation).not.toHaveProperty(key);
      }
      expect(data['message']).toBe('Операция создана и ожидает выполнения');
      expect(getWarnings(result)).toBeDefined();
    });

    it('не выдаёт предупреждений, когда все запрошенные поля пришли', async () => {
      vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue({
        id: 'op-2b',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op-2b',
        status: 'CREATED',
      });

      const result = await tool.execute({ operationId: 'op-2b', fields: ['status'] });

      expect(getWarnings(result)).toBeUndefined();
    });
  });

  describe('сообщения статуса и обработка ошибок', () => {
    it.each([
      ['CREATED', 'Операция создана и ожидает выполнения'],
      ['COMPLETE', 'Операция успешно завершена'],
      ['FAILED', 'Операция завершена с ошибкой'],
    ])('строит сообщение для статуса %s', async (status, expected) => {
      vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue({
        id: 'op-3',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op-3',
        status,
      });

      const data = parseData(await tool.execute({ operationId: 'op-3', fields: ['status'] }));

      expect(data['message']).toBe(expected);
    });

    it('не считает ошибкой статус, которого нет в документации', async () => {
      vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue({
        id: 'op-4',
        self: 'https://api.tracker.yandex.net/v3/bulkchange/op-4',
        status: 'IN_PROGRESS',
        statusText: 'Выполняется',
      });

      const result = await tool.execute({ operationId: 'op-4', fields: ['status', 'statusText'] });
      const data = parseData(result);
      const operation = data['operation'] as Record<string, unknown>;

      expect(result.isError).toBeUndefined();
      expect(operation['status']).toBe('IN_PROGRESS');
      expect(data['message']).toBe(
        'Статус "IN_PROGRESS" не описан в документации API. Детали: Выполняется'
      );
    });

    it('возвращает ошибку инструмента, если API отдал отказ', async () => {
      vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockRejectedValue(
        new Error('Пакетное изменение не существует.')
      );

      const result = await tool.execute({ operationId: 'missing', fields: ['status'] });

      expect(result.isError).toBe(true);
    });
  });
});
