// tests/unit/wiki_api/api_operations/attachment/upload-attachment.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadAttachmentOperation } from '#wiki_api/api_operations/attachment/upload-attachment.operation.js';
import { MAX_ATTACHMENT_SIZE } from '#constants';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import type { Attachment } from '../../../../../src/wiki_api/entities/index.js';

describe('UploadAttachmentOperation', () => {
  let operation: UploadAttachmentOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new UploadAttachmentOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен провести файл через полный протокол upload session и вернуть attachment', async () => {
    const file = Buffer.from('hello world');
    const expectedAttachment: Attachment = { id: 999, name: 'test.txt', size: file.length };

    vi.mocked(mockHttpClient.post)
      .mockResolvedValueOnce({ session_id: 'session-abc' }) // create session
      .mockResolvedValueOnce(undefined) // finish
      .mockResolvedValueOnce({ results: [expectedAttachment] }); // attach to page

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const putBinarySpy = vi.spyOn(operation as any, 'putBinary').mockResolvedValue(undefined);

    const result = await operation.execute({ idx: 123, filename: 'test.txt', file });

    expect(mockHttpClient.post).toHaveBeenNthCalledWith(1, '/v1/upload_sessions', {
      file_name: 'test.txt',
      file_size: file.length,
    });
    expect(putBinarySpy).toHaveBeenCalledWith(
      '/v1/upload_sessions/session-abc/upload_part?part_number=1',
      file
    );
    expect(mockHttpClient.post).toHaveBeenNthCalledWith(
      2,
      '/v1/upload_sessions/session-abc/finish'
    );
    expect(mockHttpClient.post).toHaveBeenNthCalledWith(3, '/v1/pages/123/attachments', {
      upload_sessions: ['session-abc'],
    });
    expect(result).toEqual(expectedAttachment);
  });

  it('должен отклонить пустой файл (0 байт) без обращения к API', async () => {
    await expect(
      operation.execute({ idx: 1, filename: 'empty.txt', file: Buffer.alloc(0) })
    ).rejects.toThrow(/пуст/);

    expect(mockHttpClient.post).not.toHaveBeenCalled();
  });

  it('должен отклонить файл больше MAX_ATTACHMENT_SIZE без обращения к API', async () => {
    const oversized = Buffer.alloc(MAX_ATTACHMENT_SIZE + 1);

    await expect(
      operation.execute({ idx: 1, filename: 'big.bin', file: oversized })
    ).rejects.toThrow(/слишком большой/);

    expect(mockHttpClient.post).not.toHaveBeenCalled();
  });

  it('должен бросить ошибку, если API не вернул results[0]', async () => {
    vi.mocked(mockHttpClient.post)
      .mockResolvedValueOnce({ session_id: 'session-abc' })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ results: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(operation as any, 'putBinary').mockResolvedValue(undefined);

    await expect(
      operation.execute({ idx: 1, filename: 'x.txt', file: Buffer.from('x') })
    ).rejects.toThrow(/не вернул прикреплённый файл/);
  });
});
