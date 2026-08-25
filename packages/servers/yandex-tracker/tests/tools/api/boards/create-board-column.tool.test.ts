/**
 * Unit тесты для CreateBoardColumnTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateBoardColumnTool } from '#tools/api/boards/create-board-column.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

function paginated<T>(items: T[]) {
  return {
    items,
    pagination: {
      hasNextPage: false,
      fetchedAll: true,
      truncated: false,
      hasError: false,
      pagesFetched: 1,
    },
  };
}

describe('CreateBoardColumnTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateBoardColumnTool;

  beforeEach(() => {
    mockTrackerFacade = {
      createBoardColumn: vi.fn(),
      // По умолчанию доска пуста — без дубликата id, `detectDuplicateColumnId` молчит.
      getBoardColumns: vi.fn().mockResolvedValue(paginated([])),
    } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new CreateBoardColumnTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если statuses пуст', async () => {
    const result = await tool.execute({
      boardId: 'b1',
      name: 'Done',
      statuses: [],
      fields: ['id'],
    });
    expect(result.isError).toBe(true);
  });

  it('создаст колонку', async () => {
    const column = {
      id: 1,
      name: 'Done',
      statuses: [{ id: '1', key: 'closed', display: 'Closed' }],
    };
    vi.mocked(mockTrackerFacade.createBoardColumn).mockResolvedValue(column);

    const result = await tool.execute({
      boardId: 'b1',
      name: 'Done',
      statuses: ['closed'],
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createBoardColumn).toHaveBeenCalledWith({
      boardId: 'b1',
      name: 'Done',
      statuses: ['closed'],
    });
  });

  it('примет числовой boardId (как отдаёт get_boards) и дойдёт до того же запроса', async () => {
    const column = {
      id: 1,
      name: 'Done',
      statuses: [{ id: '1', key: 'closed', display: 'Closed' }],
    };
    vi.mocked(mockTrackerFacade.createBoardColumn).mockResolvedValue(column);

    const result = await tool.execute({
      boardId: 42,
      name: 'Done',
      statuses: ['closed'],
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createBoardColumn).toHaveBeenCalledWith({
      boardId: '42',
      name: 'Done',
      statuses: ['closed'],
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createBoardColumn).mockRejectedValue(new Error('Invalid status'));
    const result = await tool.execute({
      boardId: 'b1',
      name: 'X',
      statuses: ['bad'],
      fields: ['id'],
    });
    expect(result.isError).toBe(true);
  });

  it('предупредит, если после создания на доске оказалось несколько колонок с тем же id (D11)', async () => {
    const created = { id: 1, name: 'Новая колонка' };
    vi.mocked(mockTrackerFacade.createBoardColumn).mockResolvedValue(created);
    vi.mocked(mockTrackerFacade.getBoardColumns).mockResolvedValue(
      paginated([
        { id: 1, name: 'Открыт' },
        { id: 1, name: 'Новая колонка' },
      ])
    );

    const result = await tool.execute({
      boardId: 'b1',
      name: 'Новая колонка',
      statuses: ['open'],
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const structured = JSON.parse(getTextContent(result)) as {
      warnings?: Array<{ code: string }>;
    };
    expect(structured.warnings).toEqual([expect.objectContaining({ code: 'AMBIGUOUS_ENTITY_ID' })]);
  });

  it('останется успешным, если создание прошло, а диагностическое чтение колонок упало (D9-зеркало)', async () => {
    const created = { id: 1, name: 'Новая колонка' };
    vi.mocked(mockTrackerFacade.createBoardColumn).mockResolvedValue(created);
    vi.mocked(mockTrackerFacade.getBoardColumns).mockRejectedValue(new Error('GET упал'));

    const result = await tool.execute({
      boardId: 'b1',
      name: 'Новая колонка',
      statuses: ['open'],
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const structured = JSON.parse(getTextContent(result)) as {
      data: { message: string };
    };
    expect(structured.data.message).toContain('успешно создана');
  });

  it('не предупредит, если id созданной колонки на доске уникален', async () => {
    const created = { id: 2, name: 'Уникальная' };
    vi.mocked(mockTrackerFacade.createBoardColumn).mockResolvedValue(created);
    vi.mocked(mockTrackerFacade.getBoardColumns).mockResolvedValue(
      paginated([
        { id: 1, name: 'Открыт' },
        { id: 2, name: 'Уникальная' },
      ])
    );

    const result = await tool.execute({
      boardId: 'b1',
      name: 'Уникальная',
      statuses: ['open'],
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    const structured = JSON.parse(getTextContent(result)) as { warnings?: unknown };
    expect(structured.warnings).toBeUndefined();
  });
});
