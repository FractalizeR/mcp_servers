/**
 * Helpers для тестирования загрузки файлов
 */

/**
 * Создать mock Buffer для тестов
 *
 * @param content - содержимое файла (строка)
 * @returns Buffer с содержимым
 *
 * @example
 * ```typescript
 * const buffer = createMockFileBuffer('test content');
 * ```
 */
export function createMockFileBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

/**
 * Создать mock Buffer для бинарного файла
 *
 * @param size - размер файла в байтах
 * @returns Buffer заданного размера
 *
 * @example
 * ```typescript
 * const buffer = createMockBinaryBuffer(1024); // 1KB файл
 * ```
 */
export function createMockBinaryBuffer(size: number): Buffer {
  return Buffer.alloc(size, 0);
}

/**
 * Создать mock FormData с файлом для тестов
 *
 * @param buffer - содержимое файла
 * @param filename - имя файла
 * @param fieldName - имя поля формы
 * @returns FormData с файлом
 *
 * @example
 * ```typescript
 * const buffer = createMockFileBuffer('test');
 * const formData = createMockFormData(buffer, 'test.txt');
 * ```
 */
export function createMockFormData(buffer: Buffer, filename: string, fieldName = 'file'): FormData {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)]);
  formData.append(fieldName, blob, filename);
  return formData;
}

/**
 * Создать mock файл с заданными параметрами
 *
 * @param options - параметры файла
 * @returns объект с Buffer и метаданными
 *
 * @example
 * ```typescript
 * const file = createMockFile({
 *   content: 'test content',
 *   filename: 'document.pdf',
 *   mimeType: 'application/pdf'
 * });
 * ```
 */
export function createMockFile(options: { content: string; filename: string; mimeType?: string }): {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
} {
  const buffer = createMockFileBuffer(options.content);

  return {
    buffer,
    filename: options.filename,
    mimeType: options.mimeType || 'application/octet-stream',
    size: buffer.length,
  };
}

/**
 * Сравнить два Buffer на полное совпадение
 *
 * @param buffer1 - первый Buffer
 * @param buffer2 - второй Buffer
 * @returns true если содержимое идентично
 *
 * @example
 * ```typescript
 * const original = Buffer.from('test');
 * const downloaded = Buffer.from('test');
 * expect(compareBuffers(original, downloaded)).toBe(true);
 * ```
 */
export function compareBuffers(buffer1: Buffer, buffer2: Buffer): boolean {
  if (buffer1.length !== buffer2.length) {
    return false;
  }
  return buffer1.equals(buffer2);
}

/**
 * Создать тестовое изображение (1x1 PNG)
 *
 * @returns Buffer с минимальным валидным PNG
 *
 * @example
 * ```typescript
 * const image = createTestImage();
 * // Используется для тестов загрузки/скачивания изображений
 * ```
 */
export function createTestImage(): Buffer {
  // Minimal valid PNG (1x1 red pixel)
  return Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR chunk
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01,
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53,
    0xde,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x49,
    0x44,
    0x41,
    0x54,
    0x08,
    0xd7,
    0x63,
    0xf8,
    0xcf,
    0xc0,
    0x00,
    0x00,
    0x00,
    0x03,
    0x00,
    0x01,
    0xcc,
    0xd1,
    0x59,
    0x66,
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e,
    0x44,
    0xae,
    0x42,
    0x60,
    0x82,
  ]);
}

/**
 * Конвертировать Buffer в base64 строку
 *
 * @param buffer - Buffer для конвертации
 * @returns base64 строка
 *
 * @example
 * ```typescript
 * const buffer = Buffer.from('test');
 * const base64 = bufferToBase64(buffer);
 * ```
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Конвертировать base64 строку в Buffer
 *
 * @param base64 - base64 строка
 * @returns Buffer
 *
 * @example
 * ```typescript
 * const base64 = 'dGVzdA==';
 * const buffer = base64ToBuffer(base64);
 * ```
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}
