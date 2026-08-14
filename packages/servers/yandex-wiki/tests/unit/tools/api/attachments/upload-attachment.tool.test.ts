// tests/unit/tools/api/attachments/upload-attachment.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadAttachmentTool } from '../../../../../src/tools/api/attachments/upload/upload-attachment.tool.js';
import { UPLOAD_ATTACHMENT_TOOL_METADATA } from '../../../../../src/tools/api/attachments/upload/upload-attachment.metadata.js';
import { createMockLogger, createMockFacade } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('UploadAttachmentTool', () => {
  let tool: UploadAttachmentTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new UploadAttachmentTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(UploadAttachmentTool.METADATA).toBe(UPLOAD_ATTACHMENT_TOOL_METADATA);
      expect(UploadAttachmentTool.METADATA.name).toBe('yw_upload_attachment');
    });
  });

  describe('execute', () => {
    it('должен декодировать base64 и передать Buffer в facade', async () => {
      vi.mocked(mockFacade.uploadAttachment!).mockResolvedValue({ id: 1, name: 'test.txt' });
      const base64 = Buffer.from('hello world').toString('base64');

      const result = await tool.execute({ idx: 123, filename: 'test.txt', fileContent: base64 });

      expect(mockFacade.uploadAttachment).toHaveBeenCalledWith({
        idx: 123,
        filename: 'test.txt',
        file: Buffer.from('hello world'),
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах (пустой fileContent)', async () => {
      const result = await tool.execute({ idx: 123, filename: 'x.txt', fileContent: '' });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade (например, превышение размера)', async () => {
      vi.mocked(mockFacade.uploadAttachment!).mockRejectedValue(new Error('Файл слишком большой'));

      const result = await tool.execute({
        idx: 123,
        filename: 'x.txt',
        fileContent: Buffer.from('x').toString('base64'),
      });
      expect(result.isError).toBe(true);
    });
  });
});
