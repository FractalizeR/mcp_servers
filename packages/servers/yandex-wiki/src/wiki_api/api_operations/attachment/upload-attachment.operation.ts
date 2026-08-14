/**
 * Операция загрузки файла (attachment) на страницу
 *
 * ОТВЕТСТВЕННОСТЬ: атомарно (с точки зрения вызывающего) провести файл через
 * протокол Upload Session Wiki API — единственный документированный способ
 * прикрепить файл к странице (`pagesattachments__attach_file.md`:
 * `POST /pages/{id}/attachments` принимает НЕ сами байты, а
 * `{upload_sessions: [session_id]}` — файл должен быть загружен ЗАРАНЕЕ
 * через отдельную область `upload_sessions`).
 *
 * ПОЧЕМУ ОДНА ОПЕРАЦИЯ НА 4 HTTP-ВЫЗОВА, А НЕ 4 ОТДЕЛЬНЫХ ИНСТРУМЕНТА.
 *
 * План (см. .agentic-planning/plan_mcp_2026_modernization/7.2_api_coverage_parallel.md,
 * пакет 7.2.D) прямо исключает "Upload Sessions (MS365) — шесть методов с
 * состоянием и дедлайнами" из реализации. Проверка документации ПОДТВЕРДИЛА
 * методы (create/upload_part/finish/abort/get), но ОПРОВЕРГЛА причину
 * исключения: сессии — НЕ MS365-специфика (`cloud_page`), а единственный
 * путь прикрепить ЛЮБОЙ файл к ЛЮБОЙ странице (см. отчёт агента, находка
 * пакета 7.2.D). Раздавать агенту 6 сырых инструментов с состоянием
 * (session_id, дедлайны, abort) по-прежнему нежелательно — вместо этого
 * ЭТА операция инкапсулирует ровно необходимый путь для одного файла
 * ЦЕЛИКОМ одним куском (part_number=1 — "последняя часть" по терминологии
 * API, освобождена от минимума 5 МБ/часть):
 *   1. POST /v1/upload_sessions            {file_name, file_size} → session_id
 *   2. PUT  /v1/upload_sessions/{id}/upload_part?part_number=1   <bytes>
 *   3. POST /v1/upload_sessions/{id}/finish
 *   4. POST /v1/pages/{idx}/attachments     {upload_sessions: [session_id]}
 *
 * Ни create/abort/get/upload_part/finish НЕ выставлены отдельными MCP tools —
 * агент не может создать сессию и бросить её висеть незавершённой.
 *
 * ОГРАНИЧЕНИЕ РАЗМЕРА: 10 МБ (см. MAX_FILE_SIZE) — тот же порог, что и у
 * Трекера (`UploadAttachmentOperation.DEFAULT_MAX_FILE_SIZE`), с запасом
 * ниже документированного потолка одной части API (16 МБ). Файлы крупнее не
 * поддержаны этой операцией намеренно — не multipart-цикл, а одна часть.
 */

import { BaseOperation } from '../base-operation.js';
import type { Attachment, AttachFileResponse } from '#wiki_api/entities/index.js';

export interface UploadAttachmentParams {
  readonly idx: number;
  readonly filename: string;
  readonly file: Buffer;
}

interface UploadSessionResponse {
  readonly session_id: string;
}

/** 10 МБ — см. заголовок файла про ограничение размера. */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export class UploadAttachmentOperation extends BaseOperation {
  async execute(params: UploadAttachmentParams): Promise<Attachment> {
    const { idx, filename, file } = params;

    if (file.length === 0) {
      throw new Error('Файл пуст (0 байт) — загрузка отклонена');
    }
    if (file.length > MAX_ATTACHMENT_SIZE) {
      throw new Error(
        `Файл слишком большой: ${file.length} байт. ` +
          `Максимальный размер для yw_upload_attachment: ${MAX_ATTACHMENT_SIZE} байт (10 МБ)`
      );
    }

    this.logger.info(`Uploading attachment ${filename} (${file.length} bytes) to page ${idx}`);

    const session = await this.httpClient.post<UploadSessionResponse>('/v1/upload_sessions', {
      file_name: filename,
      file_size: file.length,
    });

    await this.putBinary(
      `/v1/upload_sessions/${session.session_id}/upload_part?part_number=1`,
      file
    );

    await this.httpClient.post(`/v1/upload_sessions/${session.session_id}/finish`);

    const response = await this.httpClient.post<AttachFileResponse>(
      `/v1/pages/${idx}/attachments`,
      { upload_sessions: [session.session_id] }
    );

    const attached = response.results[0];
    if (attached === undefined) {
      throw new Error(
        `Wiki API не вернул прикреплённый файл в results (session_id=${session.session_id})`
      );
    }

    this.logger.info(`Attachment ${filename} uploaded to page ${idx}, attachmentId=${attached.id}`);

    return attached;
  }
}
