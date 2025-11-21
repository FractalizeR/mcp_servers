/**
 * Attachments Tools exports
 * Экспорт всех инструментов для работы с прикрепленными файлами
 */

// Get Attachments
export {
  GetAttachmentsTool,
  GetAttachmentsParamsSchema,
  type GetAttachmentsParams,
} from './get/index.js';

// Upload Attachment
export {
  UploadAttachmentTool,
  UploadAttachmentParamsSchema,
  type UploadAttachmentParams,
} from './upload/index.js';

// Download Attachment
export {
  DownloadAttachmentTool,
  DownloadAttachmentParamsSchema,
  type DownloadAttachmentParams,
} from './download/index.js';

// Delete Attachment
export {
  DeleteAttachmentTool,
  DeleteAttachmentParamsSchema,
  type DeleteAttachmentParams,
} from './delete/index.js';

// Get Thumbnail
export {
  GetThumbnailTool,
  GetThumbnailParamsSchema,
  type GetThumbnailParams,
} from './thumbnail/index.js';
