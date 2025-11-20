/**
 * Определение MCP tool для удаления файла из задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DELETE_ATTACHMENT_TOOL_METADATA } from './delete-attachment.metadata.js';

/**
 * Definition для DeleteAttachmentTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Предупреждения об необратимости операции
 */
export class DeleteAttachmentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DELETE_ATTACHMENT_TOOL_METADATA;
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
      'Удаляет файл (issueId*, attachmentId*). ' +
      '⚠️ ВНИМАНИЕ: Операция необратима! Файл будет удален безвозвратно. ' +
      'ВАЖНО: Получить attachmentId можно через get_attachments. ' +
      'Для загрузки/скачивания: upload_attachment, download_attachment.'
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
   * Построить описание параметра attachmentId
   */
  private buildAttachmentIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'ID прикрепленного файла для удаления (получить через get_attachments)',
      {
        minLength: 1,
        examples: ['12345', 'abc123'],
      }
    );
  }
}
