/**
 * Attachments Tools exports
 * Экспорт всех инструментов для работы с прикрепленными файлами
 */

// Get Attachments
export {
  GetAttachmentsTool,
  GetAttachmentsDefinition,
  GetAttachmentsParamsSchema,
  type GetAttachmentsParams,
} from './get/index.js';

// Upload Attachment
export {
  UploadAttachmentTool,
  UploadAttachmentDefinition,
  UploadAttachmentParamsSchema,
  type UploadAttachmentParams,
} from './upload/index.js';

// Download Attachment
export {
  DownloadAttachmentTool,
  DownloadAttachmentDefinition,
  DownloadAttachmentParamsSchema,
  type DownloadAttachmentParams,
} from './download/index.js';

// Delete Attachment
export {
  DeleteAttachmentTool,
  DeleteAttachmentDefinition,
  DeleteAttachmentParamsSchema,
  type DeleteAttachmentParams,
} from './delete/index.js';

// Get Thumbnail
export {
  GetThumbnailTool,
  GetThumbnailDefinition,
  GetThumbnailParamsSchema,
  type GetThumbnailParams,
} from './thumbnail/index.js';
