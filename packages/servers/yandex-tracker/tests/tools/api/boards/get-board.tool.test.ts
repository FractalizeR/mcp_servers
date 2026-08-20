/**
 * Unit тесты для GetBoardTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetBoardTool } from '#tools/api/boards/get-board.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('GetBoardTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetBoardTool;

  beforeEach(() => {
    mockTrackerFacade = { getBoard: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetBoardTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом boardId', async () => {
    const result = await tool.execute({ boardId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт доску при успешном запросе', async () => {
    const board = { id: '1', self: 'url', version: 1, name: 'Board 1' };
    vi.mocked(mockTrackerFacade.getBoard).mockResolvedValue(board);

    const result = await tool.execute({ boardId: '1', fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getBoard).toHaveBeenCalledWith('1', { localized: undefined });

    const parsed = JSON.parse(getTextContent(result)) as {
      data: { board: { id: string; name: string } };
    };
    expect(parsed.data.board.id).toBe('1');
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getBoard).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ boardId: '999', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  describe('Предупреждения о полях без значения (FIELDS_WITHOUT_VALUE)', () => {
    it('добавляет warning при запросе несуществующего поля', async () => {
      const board = { id: '1', self: 'url', version: 1, name: 'Board 1' };
      vi.mocked(mockTrackerFacade.getBoard).mockResolvedValue(board);

      const result = await tool.execute({ boardId: '1', fields: ['id', 'bogusField'] });

      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        warnings?: Array<{ code: string; details?: { fields: string[] } }>;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings?.[0]?.code).toBe('FIELDS_WITHOUT_VALUE');
      expect(parsed.warnings?.[0]?.details?.fields).toEqual(['bogusField']);
    });

    it('ответ без предупреждений не содержит ключа warnings ни в одной из проекций', async () => {
      const board = { id: '1', self: 'url', version: 1, name: 'Board 1' };
      vi.mocked(mockTrackerFacade.getBoard).mockResolvedValue(board);

      const result = await tool.execute({ boardId: '1', fields: ['id', 'name'] });

      const parsed = JSON.parse(getTextContent(result)) as Record<string, unknown>;
      expect('warnings' in parsed).toBe(false);
      expect(
        result['structuredContent'] && 'warnings' in (result['structuredContent'] as object)
      ).toBe(false);
    });
  });
});
