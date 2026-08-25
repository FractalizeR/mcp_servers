/**
 * Фикстуры для Attachment entity
 *
 * Используются в тестах для создания mock данных прикрепленных файлов.
 */

import type {
  Attachment,
  AttachmentWithUnknownFields,
} from '../../src/tracker_api/entities/attachment.entity.js';
import { createUserRef } from './common-fixtures.js';

/**
 * Создать Attachment для тестов
 *
 * @example
 * ```typescript
 * // Создать файл с дефолтными значениями
 * const attachment = createAttachmentFixture();
 *
 * // Создать изображение с миниатюрой
 * const image = createAttachmentFixture({
 *   name: 'screenshot.png',
 *   mimetype: 'image/png',
 *   size: 1024,
 *   thumbnail: 'https://api.tracker.yandex.net/v3/issues/TEST-1/thumbnails/12345'
 * });
 *
 * // Создать PDF документ
 * const pdf = createAttachmentFixture({
 *   name: 'report.pdf',
 *   mimetype: 'application/pdf',
 *   size: 10240
 * });
 * ```
 */
export function createAttachmentFixture(
  overrides?: Partial<Attachment>
): AttachmentWithUnknownFields {
  const id = overrides?.id || '67890';
  const issueKey = 'TEST-123';

  return {
    id,
    self: `https://api.tracker.yandex.net/v3/issues/${issueKey}/attachments/${id}`,
    name: 'test-file.txt',
    content: `https://api.tracker.yandex.net/v3/issues/${issueKey}/attachments/${id}/test-file.txt`,
    createdBy: createUserRef(),
    createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
    mimetype: 'text/plain',
    size: 1024,
    ...overrides,
  };
}

/**
 * Создать Attachment для изображения с миниатюрой
 *
 * @example
 * ```typescript
 * const imageAttachment = createImageAttachmentFixture({
 *   name: 'screenshot.png',
 *   size: 2048
 * });
 * ```
 */
export function createImageAttachmentFixture(
  overrides?: Partial<Attachment>
): AttachmentWithUnknownFields {
  const id = overrides?.id || '67890';
  const issueKey = 'TEST-123';
  const name = overrides?.name || 'image.png';

  return createAttachmentFixture({
    id,
    name,
    mimetype: 'image/png',
    thumbnail: `https://api.tracker.yandex.net/v3/issues/${issueKey}/thumbnails/${id}`,
    size: 2048,
    ...overrides,
  });
}

/**
 * Создать массив Attachments для тестов
 *
 * @example
 * ```typescript
 * const attachments = createAttachmentListFixture(3);
 * // Вернёт массив из 3 прикреплённых файлов с уникальными id
 * ```
 */
export function createAttachmentListFixture(
  count: number,
  baseOverrides?: Partial<Attachment>
): AttachmentWithUnknownFields[] {
  return Array.from({ length: count }, (_, index) =>
    createAttachmentFixture({
      id: `${67890 + index}`,
      name: `file-${index + 1}.txt`,
      ...baseOverrides,
    })
  );
}

/**
 * Создать Attachment с минимальными обязательными полями
 * (полезно для negative testing)
 *
 * @example
 * ```typescript
 * const minimal = createMinimalAttachmentFixture();
 * ```
 */
export function createMinimalAttachmentFixture(id = '67890', issueKey = 'TEST-123'): Attachment {
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/issues/${issueKey}/attachments/${id}`,
    name: 'minimal.txt',
    content: `https://api.tracker.yandex.net/v3/issues/${issueKey}/attachments/${id}/minimal.txt`,
    createdBy: createUserRef(),
    createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
    mimetype: 'text/plain',
    size: 0,
  };
}
