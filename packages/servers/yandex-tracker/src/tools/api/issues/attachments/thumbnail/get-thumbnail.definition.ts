/**
 * Определение MCP tool для получения миниатюры изображения
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetThumbnailTool } from './get-thumbnail.tool.js';

/**
 * Definition для GetThumbnailTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Ограничения (только изображения)
 */
export class GetThumbnailDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetThumbnailTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          attachmentId: this.buildAttachmentIdParam(),
          saveToPath: this.buildSaveToPathParam(),
        },
        required: ['issueId', 'attachmentId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получить миниатюру (thumbnail) прикрепленного изображения из задачи. ' +
      'Работает только для файлов типа изображение (PNG, JPG, GIF и т.д.). ' +
      'По умолчанию возвращает миниатюру в base64 формате. ' +
      'Опционально можно сохранить миниатюру по указанному пути (saveToPath). ' +
      '\n\n' +
      'Для: предпросмотра изображений, получения уменьшенных версий скриншотов. ' +
      '\n' +
      'Не для: скачивания полноразмерных файлов (download_attachment), не-изображений.' +
      '\n\n' +
      'ВАЖНО: Работает только для изображений! ' +
      'Для PDF, текстовых файлов используйте download_attachment.'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ или ID задачи (формат QUEUE-123 или abc123)', {
      pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
      examples: ['PROJ-123', 'abc123def456'],
    });
  }

  /**
   * Построить описание параметра attachmentId
   */
  private buildAttachmentIdParam(): Record<string, unknown> {
    return this.buildStringParam('ID прикрепленного изображения (получить через get_attachments)', {
      minLength: 1,
      examples: ['12345', 'abc123'],
    });
  }

  /**
   * Построить описание параметра saveToPath
   */
  private buildSaveToPathParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Путь для сохранения миниатюры (опционально). ' +
        'Если указан, миниатюра будет сохранена по этому пути. ' +
        'Если не указан, миниатюра вернется в base64 формате в ответе.',
    };
  }
}
