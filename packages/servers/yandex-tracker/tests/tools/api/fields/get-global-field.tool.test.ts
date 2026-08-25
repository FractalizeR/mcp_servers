/**
 * Unit тесты для GetGlobalFieldTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetGlobalFieldTool } from '#tools/api/fields/get-global-field.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('GetGlobalFieldTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetGlobalFieldTool;

  beforeEach(() => {
    mockTrackerFacade = { getField: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetGlobalFieldTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом fieldId', async () => {
    const result = await tool.execute({ fieldId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт глобальное поле по ID', async () => {
    const field = { id: 'customField123', self: 'url', name: 'Custom' };
    vi.mocked(mockTrackerFacade.getField).mockResolvedValue(field);

    const result = await tool.execute({ fieldId: 'customField123', fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getField).toHaveBeenCalledWith('customField123');
  });

  it('вернёт поле с булевым options (форма боевого ответа, не массив опций)', async () => {
    const field = { id: 'customField123', self: 'url', name: 'Custom', options: true };
    vi.mocked(mockTrackerFacade.getField).mockResolvedValue(field);

    const result = await tool.execute({ fieldId: 'customField123', fields: ['id', 'options'] });

    const parsed = result['structuredContent'] as {
      success: boolean;
      data: { globalField: { options: boolean } };
    };
    expect(parsed.success).toBe(true);
    expect(parsed.data.globalField.options).toBe(true);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getField).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ fieldId: 'customField123', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  describe('Предупреждения о полях без значения (FIELDS_WITHOUT_VALUE)', () => {
    it('добавляет warning, когда запрошенное поле не пришло от API', async () => {
      const field = { id: 'customField123', self: 'url', name: 'Custom' }; // без description
      vi.mocked(mockTrackerFacade.getField).mockResolvedValue(field);

      const result = await tool.execute({
        fieldId: 'customField123',
        fields: ['id', 'description'],
      });

      const parsed = result['structuredContent'] as {
        success: boolean;
        warnings?: Array<{ code: string; details?: { fields: string[] } }>;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings?.[0]?.code).toBe('FIELDS_WITHOUT_VALUE');
      expect(parsed.warnings?.[0]?.details?.fields).toEqual(['description']);
    });

    it('ответ без предупреждений не содержит ключа warnings (обе проекции)', async () => {
      const field = { id: 'customField123', self: 'url', name: 'Custom' };
      vi.mocked(mockTrackerFacade.getField).mockResolvedValue(field);

      const result = await tool.execute({ fieldId: 'customField123', fields: ['id', 'name'] });

      const textBlock = (result.content?.[0] as { text?: string } | undefined)?.text ?? '';
      expect(textBlock.includes('"warnings"')).toBe(false);
      expect(
        result['structuredContent'] && 'warnings' in (result['structuredContent'] as object)
      ).toBe(false);
    });
  });
});
