/**
 * Утилиты для работы с загрузкой файлов
 *
 * Используются в API operations для подготовки файлов к загрузке
 * и валидации файлов.
 */

import { lookup } from 'mime-types';

/**
 * Утилита для работы с загрузкой файлов
 */
export class FileUploadUtil {
  /**
   * Подготовить multipart/form-data для загрузки файла
   *
   * ВАЖНО: В Node.js используется FormData из глобального пространства имен.
   * Для совместимости с различными версиями Node.js используем динамический импорт.
   *
   * @param file - содержимое файла (Buffer)
   * @param filename - имя файла
   * @param fieldName - имя поля формы (по умолчанию "file")
   * @returns FormData с файлом
   *
   * @example
   * ```typescript
   * const buffer = Buffer.from('file content');
   * const formData = FileUploadUtil.prepareMultipartFormData(
   *   buffer,
   *   'document.pdf',
   *   'attachment'
   * );
   * ```
   */
  static prepareMultipartFormData(file: Buffer, filename: string, fieldName = 'file'): FormData {
    const formData = new FormData();

    // Определяем MIME тип
    const mimeType = FileUploadUtil.getMimeType(filename);

    // Создаем Blob из Buffer
    const blob = new Blob([file], { type: mimeType });

    // Добавляем файл в FormData
    formData.append(fieldName, blob, filename);

    return formData;
  }

  /**
   * Валидация размера файла
   *
   * @param size - размер файла в байтах
   * @param maxSize - максимальный размер в байтах
   * @returns true если размер допустим, false иначе
   *
   * @example
   * ```typescript
   * const isValid = FileUploadUtil.validateFileSize(
   *   1024 * 1024, // 1 MB
   *   10 * 1024 * 1024 // max 10 MB
   * );
   * ```
   */
  static validateFileSize(size: number, maxSize: number): boolean {
    if (size < 0) {
      return false;
    }

    return size <= maxSize;
  }

  /**
   * Определить MIME тип файла по расширению
   *
   * @param filename - имя файла
   * @returns MIME тип или 'application/octet-stream' если не определен
   *
   * @example
   * ```typescript
   * const mimeType = FileUploadUtil.getMimeType('document.pdf');
   * // 'application/pdf'
   *
   * const mimeType = FileUploadUtil.getMimeType('image.jpg');
   * // 'image/jpeg'
   * ```
   */
  static getMimeType(filename: string): string {
    const mimeType = lookup(filename);
    return mimeType !== false ? mimeType : 'application/octet-stream';
  }

  /**
   * Получить расширение файла
   *
   * @param filename - имя файла
   * @returns расширение файла (без точки) или пустая строка
   *
   * @example
   * ```typescript
   * const ext = FileUploadUtil.getFileExtension('document.pdf');
   * // 'pdf'
   * ```
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length < 2) {
      return '';
    }
    const lastPart = parts[parts.length - 1];
    return lastPart ? lastPart.toLowerCase() : '';
  }

  /**
   * Валидация имени файла
   *
   * Проверяет, что имя файла не содержит недопустимых символов
   * и не пытается выйти за пределы директории (path traversal).
   *
   * @param filename - имя файла
   * @returns true если имя допустимо, false иначе
   *
   * @example
   * ```typescript
   * FileUploadUtil.validateFilename('document.pdf'); // true
   * FileUploadUtil.validateFilename('../etc/passwd'); // false
   * FileUploadUtil.validateFilename('file<script>.js'); // false
   * ```
   */
  static validateFilename(filename: string): boolean {
    if (!filename || filename.trim().length === 0) {
      return false;
    }

    // Проверка на path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    // Проверка на недопустимые символы (включая control characters 0x00-0x1F)
    // eslint-disable-next-line sonarjs/no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1F]/;
    if (invalidChars.test(filename)) {
      return false;
    }

    return true;
  }

  /**
   * Форматировать размер файла для отображения
   *
   * @param bytes - размер в байтах
   * @returns отформатированная строка
   *
   * @example
   * ```typescript
   * FileUploadUtil.formatFileSize(1024); // "1.0 KB"
   * FileUploadUtil.formatFileSize(1024 * 1024); // "1.0 MB"
   * FileUploadUtil.formatFileSize(1536); // "1.5 KB"
   * ```
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}
