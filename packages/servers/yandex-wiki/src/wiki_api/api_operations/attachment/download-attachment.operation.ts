import { BaseOperation } from '../base-operation.js';
import type { DownloadedFile } from '#wiki_api/entities/index.js';

export class DownloadAttachmentOperation extends BaseOperation {
  /**
   * `GET /v1/pages/{idx}/attachments/{fileId}/download` — в отличие от
   * Трекера, Wiki API не требует имени файла в пути, только id (подтверждено
   * `pagesattachments__download_by_file_id.md`).
   */
  async execute(idx: number, fileId: number): Promise<DownloadedFile> {
    this.logger.debug(`DownloadAttachmentOperation: downloading fileId=${fileId} from page ${idx}`);

    const result = await this.downloadFile(`/v1/pages/${idx}/attachments/${fileId}/download`);

    this.logger.info(
      `DownloadAttachmentOperation: fileId=${fileId} downloaded from page ${idx}, ` +
        `size=${result.content.length} bytes`
    );

    return result;
  }
}
