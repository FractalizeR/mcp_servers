/**
 * MCP Tool для скачивания файла из задачи Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (download attachment)
 * - Поддержка base64 и сохранения в файл
 * - Валидация через Zod
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DownloadAttachmentDefinition } from './download-attachment.definition.js';
import { DownloadAttachmentParamsSchema } from './download-attachment.schema.js';
import { writeFile } from 'node:fs/promises';

import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../../constants.js';

/**
 * Инструмент для скачивания файла из задачи
 *
 * Ответственность (SRP):
 * - Координация процесса скачивания файла из задачи
 * - Возврат base64 или сохранение в файл
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 */
export class DownloadAttachmentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('download_attachment', MCP_TOOL_PREFIX),
    description: '[Issues/Attachments] Скачать файл из задачи',
    category: ToolCategory.ISSUES,
    subcategory: 'attachments',
    priority: ToolPriority.HIGH,
    tags: ['attachments', 'read', 'download', 'files'],
    isHelper: false,
  } as const;

  private readonly definition = new DownloadAttachmentDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DownloadAttachmentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, attachmentId, filename, saveToPath } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(
        `Скачивание файла ${filename} (attachmentId=${attachmentId}) из задачи ${issueId}`
      );

      // 3. API v2: скачивание файла
      const result = await this.facade.downloadAttachment(issueId, attachmentId, filename, {
        returnBase64: !saveToPath,
      });

      // 4. Сохранение в файл если указан путь
      if (saveToPath && result.content instanceof Buffer) {
        try {
          await writeFile(saveToPath, result.content);
          this.logger.info(`Файл ${filename} сохранен в ${saveToPath}`);
        } catch (error) {
          return this.formatError(`Не удалось сохранить файл в ${saveToPath}`, error as Error);
        }
      }

      // 5. Логирование результатов
      this.logger.info(
        `Файл ${filename} (${result.metadata.size} байт) успешно скачан из задачи ${issueId}`
      );

      return this.formatSuccess({
        issueId,
        attachmentId,
        filename,
        size: result.metadata.size,
        mimetype: result.metadata.mimetype,
        ...(saveToPath
          ? { savedTo: saveToPath }
          : {
              base64:
                typeof result.content === 'string'
                  ? result.content
                  : result.content.toString('base64'),
            }),
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при скачивании файла ${filename} из задачи ${issueId}`,
        error as Error
      );
    }
  }
}
