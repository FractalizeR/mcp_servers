import type { WithUnknownFields } from './types.js';

/**
 * Вложение страницы (`/pages/{id}/attachments`, пакет 7.2.D плана
 * модернизации MCP 2026-07-28). Форма подтверждена detail-страницами
 * документации (`pagesattachments__attach_file.md`,
 * `pagesattachments__attachments.md`, `pagesattachments__download_by_file_id.md`,
 * `pagesattachments__delete_attach.md`).
 */

export type AttachmentCheckStatus = 'check' | 'ready' | 'deleted' | 'infected' | 'error';

export interface Attachment {
  readonly id: number;
  readonly name?: string;
  readonly is_downloadable?: boolean;
  readonly download_url?: string;
  readonly size?: number;
  readonly mimetype?: string;
  readonly created_at?: string;
  readonly check_status?: AttachmentCheckStatus;
  readonly has_preview?: boolean;
}

export interface AttachFileResponse {
  readonly results: Attachment[];
}

export type AttachmentWithUnknownFields = WithUnknownFields<Attachment>;

/** Результат `GET .../download` — двоичное содержимое + опциональный content-type ответа. */
export interface DownloadedFile {
  readonly content: Buffer;
  readonly contentType?: string;
}
