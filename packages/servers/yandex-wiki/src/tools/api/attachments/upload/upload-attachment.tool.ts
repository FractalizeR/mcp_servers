import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { UploadAttachmentParamsSchema } from './upload-attachment.schema.js';
import { UPLOAD_ATTACHMENT_TOOL_METADATA } from './upload-attachment.metadata.js';

export class UploadAttachmentTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = UPLOAD_ATTACHMENT_TOOL_METADATA;

  protected override getParamsSchema(): typeof UploadAttachmentParamsSchema {
    return UploadAttachmentParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UploadAttachmentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, filename, fileContent } = validation.data;

    let file: Buffer;
    try {
      file = Buffer.from(fileContent, 'base64');
    } catch (error: unknown) {
      return this.formatError(`Не удалось декодировать base64 для файла ${filename}`, error);
    }

    try {
      ResultLogger.logOperationStart(this.logger, 'Загрузка вложения', 1);

      const attachment = await this.facade.uploadAttachment({ idx, filename, file });

      return this.formatSuccess({ idx, attachment });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при загрузке вложения ${filename} на страницу: ${idx}`,
        error
      );
    }
  }
}
