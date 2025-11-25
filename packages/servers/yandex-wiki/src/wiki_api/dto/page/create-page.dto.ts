import type { PageType, TextFormat } from '#wiki_api/entities/index.js';

/**
 * Cloud page configuration (MS365)
 */
export type CloudPageConfig =
  | { method: 'empty_doc'; doctype: 'docx' | 'pptx' | 'xlsx' }
  | { method: 'from_url'; url: string }
  | { method: 'upload_doc'; mimetype: string }
  | { method: 'finalize_upload'; upload_session: string }
  | { method: 'upload_onprem'; upload_session: string };

/**
 * DTO для создания страницы
 */
export interface CreatePageDto {
  /** Тип страницы (обязательно) */
  page_type: PageType;

  /** Slug страницы (обязательно) */
  slug: string;

  /** Название страницы (1-255 символов, обязательно) */
  title: string;

  /** Содержимое страницы */
  content?: string;

  /** Формат текста для grid */
  grid_format?: TextFormat;

  /** Конфигурация облачного документа */
  cloud_page?: CloudPageConfig;
}
