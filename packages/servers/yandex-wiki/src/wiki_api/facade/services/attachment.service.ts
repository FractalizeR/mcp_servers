/**
 * Attachment Service — загрузка/скачивание вложений страницы (пакет 7.2.D).
 */

import { injectable, inject } from 'inversify';
import {
  UploadAttachmentOperation,
  DownloadAttachmentOperation,
} from '#wiki_api/api_operations/index.js';
import type { UploadAttachmentParams } from '#wiki_api/api_operations/index.js';
import type { Attachment, DownloadedFile } from '#wiki_api/entities/index.js';

@injectable()
export class AttachmentService {
  constructor(
    @inject(UploadAttachmentOperation)
    private readonly uploadAttachmentOp: UploadAttachmentOperation,
    @inject(DownloadAttachmentOperation)
    private readonly downloadAttachmentOp: DownloadAttachmentOperation
  ) {}

  async uploadAttachment(params: UploadAttachmentParams): Promise<Attachment> {
    return this.uploadAttachmentOp.execute(params);
  }

  async downloadAttachment(idx: number, fileId: number): Promise<DownloadedFile> {
    return this.downloadAttachmentOp.execute(idx, fileId);
  }
}
