// tests/unit/wiki_api/facade/services/attachment.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttachmentService } from '../../../../../src/wiki_api/facade/services/attachment.service.js';
import type {
  UploadAttachmentOperation,
  DownloadAttachmentOperation,
} from '../../../../../src/wiki_api/api_operations/index.js';

describe('AttachmentService', () => {
  let service: AttachmentService;
  let mockUpload: UploadAttachmentOperation;
  let mockDownload: DownloadAttachmentOperation;

  beforeEach(() => {
    mockUpload = { execute: vi.fn() } as unknown as UploadAttachmentOperation;
    mockDownload = { execute: vi.fn() } as unknown as DownloadAttachmentOperation;

    service = new AttachmentService(mockUpload, mockDownload);
  });

  describe('uploadAttachment', () => {
    it('должен делегировать вызов UploadAttachmentOperation', async () => {
      const expected = { id: 1, name: 'x.txt' };
      vi.mocked(mockUpload.execute).mockResolvedValue(expected);

      const params = { idx: 123, filename: 'x.txt', file: Buffer.from('x') };
      const result = await service.uploadAttachment(params);

      expect(mockUpload.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(expected);
    });
  });

  describe('downloadAttachment', () => {
    it('должен делегировать вызов DownloadAttachmentOperation', async () => {
      const expected = { content: Buffer.from('x') };
      vi.mocked(mockDownload.execute).mockResolvedValue(expected);

      const result = await service.downloadAttachment(123, 456);

      expect(mockDownload.execute).toHaveBeenCalledWith(123, 456);
      expect(result).toBe(expected);
    });
  });
});
