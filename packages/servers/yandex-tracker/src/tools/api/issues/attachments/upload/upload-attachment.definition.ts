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
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'filename', 'fields'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Загружает файл (issueId*, filename*, fields*, fileContent/filePath, mimetype). ' +
      'Поддерживает base64 (fileContent) или путь на MCP сервере (filePath). ' +
      'Максимальный размер: 10 MB. MIME тип определится автоматически. ' +
      'Для скачивания/удаления: download_attachment, delete_attachment.'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ задачи (QUEUE-123)', {
      pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
      examples: ['PROJ-123', 'abc123def456'],
    });
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
        'Содержимое файла в base64. ' +
        'Рекомендуется для удаленных клиентов. ' +
        'Если указан filePath, fileContent игнорируется.',
    };
  }

  /**
   * Построить описание параметра filePath
   */
  private buildFilePathParam(): Record<string, unknown> {
    return {
      type: 'string',
      description: 'Путь к файлу на MCP сервере. ' + 'Используется если fileContent не указан.',
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

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Массив полей для возврата в результате. ' +
        'Указывайте только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Доступные поля: id, name, mimetype, size, content (downloadUrl), thumbnail, createdBy, createdAt.',
      {
        items: { type: 'string' },
        examples: [
          ['id', 'name', 'size'],
          ['id', 'name', 'mimetype', 'size'],
          ['id', 'name', 'size', 'createdBy.display', 'createdAt'],
        ],
      }
    );
  }
}
