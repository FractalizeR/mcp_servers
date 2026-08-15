// tests/unit/wiki_api/api_operations/attachment/download-attachment.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadAttachmentOperation } from '#wiki_api/api_operations/attachment/download-attachment.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('DownloadAttachmentOperation', () => {
  let operation: DownloadAttachmentOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new DownloadAttachmentOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен скачать файл через downloadFile() и вернуть содержимое', async () => {
    const downloaded = { content: Buffer.from('binary content'), contentType: 'application/pdf' };

    const downloadFileSpy = vi
      .spyOn(operation as any, 'downloadFile')
      .mockResolvedValue(downloaded);

    const result = await operation.execute(123, 456);

    expect(downloadFileSpy).toHaveBeenCalledWith('/v1/pages/123/attachments/456/download');
    expect(result).toEqual(downloaded);
  });

  it('должен логировать операцию', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(operation as any, 'downloadFile').mockResolvedValue({ content: Buffer.from('x') });

    await operation.execute(1, 2);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('fileId=2 downloaded from page 1')
    );
  });
});
