import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { writeFile } from 'node:fs/promises';
import { DownloadAttachmentParamsSchema } from './download-attachment.schema.js';
import { DOWNLOAD_ATTACHMENT_TOOL_METADATA } from './download-attachment.metadata.js';

export class DownloadAttachmentTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = DOWNLOAD_ATTACHMENT_TOOL_METADATA;

  protected override getParamsSchema(): typeof DownloadAttachmentParamsSchema {
    return DownloadAttachmentParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DownloadAttachmentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, file_id, saveToPath } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Скачивание вложения', 1);

      const result = await this.facade.downloadAttachment(idx, file_id);

      if (saveToPath !== undefined) {
        try {
          await writeFile(saveToPath, result.content);
        } catch (error: unknown) {
          return this.formatError(`Не удалось сохранить файл в ${saveToPath}`, error);
        }
      }

      return this.formatSuccess({
        idx,
        file_id,
        size: result.content.length,
        ...(result.contentType !== undefined && { contentType: result.contentType }),
        ...(saveToPath !== undefined
          ? { savedTo: saveToPath }
          : { base64: result.content.toString('base64') }),
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при скачивании вложения ${file_id} со страницы: ${idx}`,
        error
      );
    }
  }
}
