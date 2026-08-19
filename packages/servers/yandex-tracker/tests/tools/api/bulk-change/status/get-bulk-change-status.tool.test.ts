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

describe('GetBulkChangeStatusTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetBulkChangeStatusTool;

  const fullOperation: BulkChangeOperationWithUnknownFields = {
    id: 'op-1',
    self: 'https://api.tracker.yandex.net/v2/bulkchange/op-1',
    status: 'COMPLETE',
    statusText: 'Массовое изменение выполнено',
    createdBy: createUserRef(),
    createdAt: '2024-06-26T19:00:47.451+0000',
    executionChunkPercent: 100,
    executionIssuePercent: 100,
    totalIssues: 24,
    totalCompletedIssues: 24,
  };

  beforeEach(() => {
    mockTrackerFacade = {
      getBulkChangeStatus: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetBulkChangeStatusTool(mockTrackerFacade, mockLogger);
  });

  it('требует operationId', async () => {
    const result = await tool.execute({});

    expect(result.isError).toBe(true);
  });

  it('переносит поля ответа API в выход и проходит собственную outputSchema', async () => {
    vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue(fullOperation);

    const data = parseData(await tool.execute({ operationId: 'op-1' }));

    expect(data).toMatchObject({
      operationId: 'op-1',
      status: 'COMPLETE',
      statusText: 'Массовое изменение выполнено',
      totalIssues: 24,
      totalCompletedIssues: 24,
      executionChunkPercent: 100,
      executionIssuePercent: 100,
    });
    expect(GetBulkChangeStatusOutputDataSchema.safeParse(data).success).toBe(true);
  });

  it('не подставляет отсутствующие опциональные поля', async () => {
    vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue({
      id: 'op-2',
      self: 'https://api.tracker.yandex.net/v2/bulkchange/op-2',
      status: 'CREATED',
    });

    const data = parseData(await tool.execute({ operationId: 'op-2' }));

    for (const key of ['statusText', 'totalIssues', 'executionIssuePercent', 'createdBy']) {
      expect(data).not.toHaveProperty(key);
    }
    expect(data['message']).toBe('Операция создана и ожидает выполнения');
  });

  it.each([
    ['CREATED', 'Операция создана и ожидает выполнения'],
    ['COMPLETE', 'Операция успешно завершена'],
    ['FAILED', 'Операция завершена с ошибкой'],
  ])('строит сообщение для статуса %s', async (status, expected) => {
    vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue({
      id: 'op-3',
      self: 'https://api.tracker.yandex.net/v2/bulkchange/op-3',
      status,
    });

    const data = parseData(await tool.execute({ operationId: 'op-3' }));

    expect(data['message']).toBe(expected);
  });

  it('не считает ошибкой статус, которого нет в документации', async () => {
    vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockResolvedValue({
      id: 'op-4',
      self: 'https://api.tracker.yandex.net/v2/bulkchange/op-4',
      status: 'IN_PROGRESS',
      statusText: 'Выполняется',
    });

    const result = await tool.execute({ operationId: 'op-4' });
    const data = parseData(result);

    expect(result.isError).toBeUndefined();
    expect(data['status']).toBe('IN_PROGRESS');
    expect(data['message']).toBe(
      'Статус "IN_PROGRESS" не описан в документации API. Детали: Выполняется'
    );
  });

  it('возвращает ошибку инструмента, если API отдал отказ', async () => {
    vi.mocked(mockTrackerFacade.getBulkChangeStatus).mockRejectedValue(
      new Error('Пакетное изменение не существует.')
    );

    const result = await tool.execute({ operationId: 'missing' });

    expect(result.isError).toBe(true);
  });
});
