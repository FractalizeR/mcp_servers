/**
 * Определение MCP tool для скачивания файла из задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DownloadAttachmentTool } from './download-attachment.tool.js';

/**
 * Definition для DownloadAttachmentTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class DownloadAttachmentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DownloadAttachmentTool.METADATA;
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
          filename: this.buildFilenameParam(),
          saveToPath: this.buildSaveToPathParam(),
        },
        required: ['issueId', 'attachmentId', 'filename'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Скачать прикрепленный файл из задачи Яндекс.Трекера. ' +
      'По умолчанию возвращает файл в base64 формате. ' +
      'Опционально можно сохранить файл по указанному пути (saveToPath). ' +
      '\n\n' +
      'Для: скачивания документов, изображений, логов из задачи. ' +
      '\n' +
      'Не для: загрузки/удаления файлов (upload_attachment, delete_attachment).' +
      '\n\n' +
      'ВАЖНО: Требуются все 3 параметра: issueId, attachmentId и filename. ' +
      'Получить их можно через get_attachments.'
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
    return this.buildStringParam('ID прикрепленного файла (получить через get_attachments)', {
      minLength: 1,
      examples: ['12345', 'abc123'],
    });
  }

  /**
   * Построить описание параметра filename
   */
  private buildFilenameParam(): Record<string, unknown> {
    return this.buildStringParam('Имя файла (получить через get_attachments)', {
      minLength: 1,
      examples: ['report.pdf', 'screenshot.png'],
    });
  }

  /**
   * Построить описание параметра saveToPath
   */
  private buildSaveToPathParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Путь для сохранения файла (опционально). ' +
        'Если указан, файл будет сохранен по этому пути. ' +
        'Если не указан, файл вернется в base64 формате в ответе.',
    };
  }
}
