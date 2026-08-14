// tests/unit/tools/api/attachments/download-attachment.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { DownloadAttachmentTool } from '../../../../../src/tools/api/attachments/download/download-attachment.tool.js';
import { DOWNLOAD_ATTACHMENT_TOOL_METADATA } from '../../../../../src/tools/api/attachments/download/download-attachment.metadata.js';
import { createMockLogger, createMockFacade } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('DownloadAttachmentTool', () => {
  let tool: DownloadAttachmentTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFacade = createMockFacade();
    tool = new DownloadAttachmentTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(DownloadAttachmentTool.METADATA).toBe(DOWNLOAD_ATTACHMENT_TOOL_METADATA);
      expect(DownloadAttachmentTool.METADATA.name).toBe('yw_download_attachment');
    });
  });

  describe('execute', () => {
    it('без saveToPath — возвращает base64', async () => {
      vi.mocked(mockFacade.downloadAttachment!).mockResolvedValue({
        content: Buffer.from('hello'),
        contentType: 'text/plain',
      });

      const result = await tool.execute({ idx: 123, file_id: 456 });

      expect(mockFacade.downloadAttachment).toHaveBeenCalledWith(123, 456);
      expect(result.isError).toBeFalsy();
      const data = (result.structuredContent as { data: Record<string, unknown> }).data;
      expect(data['base64']).toBe(Buffer.from('hello').toString('base64'));
      expect(data['savedTo']).toBeUndefined();
      expect(data['size']).toBe(5);
      expect(data['contentType']).toBe('text/plain');
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('с saveToPath — сохраняет файл и не возвращает base64', async () => {
      vi.mocked(mockFacade.downloadAttachment!).mockResolvedValue({
        content: Buffer.from('hello'),
      });

      const result = await tool.execute({
        idx: 123,
        file_id: 456,
        saveToPath: '/tmp/out.txt',
      });

      expect(writeFile).toHaveBeenCalledWith('/tmp/out.txt', Buffer.from('hello'));
      expect(result.isError).toBeFalsy();
      const data = (result.structuredContent as { data: Record<string, unknown> }).data;
      expect(data['savedTo']).toBe('/tmp/out.txt');
      expect(data['base64']).toBeUndefined();
    });

    it('должен вернуть ошибку, если запись файла упала', async () => {
      vi.mocked(mockFacade.downloadAttachment!).mockResolvedValue({ content: Buffer.from('x') });
      vi.mocked(writeFile).mockRejectedValueOnce(new Error('EACCES'));

      const result = await tool.execute({ idx: 123, file_id: 456, saveToPath: '/no/access' });
      expect(result.isError).toBe(true);
    });

    it('должен вернуть ошибку при невалидных параметрах (нет file_id)', async () => {
      const result = await tool.execute({ idx: 123 });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.downloadAttachment!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 123, file_id: 456 });
      expect(result.isError).toBe(true);
    });
  });
});
