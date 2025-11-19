/**
 * Определение MCP tool для загрузки файла в задачу
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { UPLOAD_ATTACHMENT_TOOL_METADATA } from './upload-attachment.metadata.js';

/**
 * Definition для UploadAttachmentTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Ограничения и лимиты
 */
export class UploadAttachmentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return UPLOAD_ATTACHMENT_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          filename: this.buildFilenameParam(),
          fileContent: this.buildFileContentParam(),
          filePath: this.buildFilePathParam(),
          mimetype: this.buildMimetypeParam(),
        },
        required: ['issueId', 'filename'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Загрузить файл в задачу Яндекс.Трекера. ' +
      'Поддерживает загрузку через base64 (fileContent) или путь к файлу (filePath). ' +
      'Максимальный размер файла: 10 MB. ' +
      '\n\n' +
      'Для: прикрепления документов, изображений, логов к задаче. ' +
      '\n' +
      'Не для: скачивания/удаления файлов (download_attachment, delete_attachment).' +
      '\n\n' +
      'ВАЖНО: Указывайте либо fileContent (base64), либо filePath. ' +
      'MIME тип определится автоматически по расширению файла.'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ или ID задачи для загрузки файла (формат QUEUE-123 или abc123)',
      {
        pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
        examples: ['PROJ-123', 'abc123def456'],
      }
    );
  }

  /**
   * Построить описание параметра filename
   */
  private buildFilenameParam(): Record<string, unknown> {
    return this.buildStringParam('Имя файла с расширением (например, report.pdf, image.png)', {
      minLength: 1,
      maxLength: 255,
      examples: ['report.pdf', 'screenshot.png', 'log.txt'],
    });
  }

  /**
   * Построить описание параметра fileContent
   */
  private buildFileContentParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Содержимое файла в формате base64. ' +
        'Используйте это поле для передачи файла напрямую. ' +
        'Если указан filePath, fileContent игнорируется.',
    };
  }

  /**
   * Построить описание параметра filePath
   */
  private buildFilePathParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Путь к файлу в файловой системе. ' +
        'Используется если fileContent не указан. ' +
        'Файл будет прочитан и загружен.',
    };
  }

  /**
   * Построить описание параметра mimetype
   */
  private buildMimetypeParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'MIME тип файла (опционально). ' +
        'Если не указан, определится автоматически по расширению файла. ' +
        'Примеры: application/pdf, image/png, text/plain',
    };
  }
}
