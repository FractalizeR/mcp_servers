/**
 * MCP Tool для получения миниатюры изображения из задачи Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get thumbnail)
 * - Только для изображений
 * - Поддержка base64 и сохранения в файл
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetThumbnailDefinition } from './get-thumbnail.definition.js';
import { GetThumbnailParamsSchema } from './get-thumbnail.schema.js';
import { writeFile } from 'node:fs/promises';

import { GET_THUMBNAIL_TOOL_METADATA } from './get-thumbnail.metadata.js';

/**
 * Инструмент для получения миниатюры изображения
 *
 * Ответственность (SRP):
 * - Координация процесса получения миниатюры изображения
 * - Возврат base64 или сохранение в файл
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 */
export class GetThumbnailTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_THUMBNAIL_TOOL_METADATA;

  private readonly definition = new GetThumbnailDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetThumbnailParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, attachmentId, saveToPath } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Получение миниатюры для attachmentId=${attachmentId} из задачи ${issueId}`);

      // 3. API v2: получение миниатюры
      const result = await this.facade.getThumbnail(issueId, attachmentId, {
        returnBase64: !saveToPath,
      });

      // 4. Сохранение в файл если указан путь
      if (saveToPath && result.content instanceof Buffer) {
        try {
          await writeFile(saveToPath, result.content);
          this.logger.info(`Миниатюра сохранена в ${saveToPath}`);
        } catch (error) {
          return this.formatError(`Не удалось сохранить миниатюру в ${saveToPath}`, error as Error);
        }
      }

      // 5. Логирование результатов
      this.logger.info(
        `Миниатюра (${result.metadata.size} байт) успешно получена для attachmentId=${attachmentId}`
      );

      return this.formatSuccess({
        issueId,
        attachmentId,
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
        `Ошибка при получении миниатюры для attachmentId=${attachmentId} из задачи ${issueId}`,
        error as Error
      );
    }
  }
}
