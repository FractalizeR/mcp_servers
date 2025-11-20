/**
 * Тесты для FileDownloadUtil
 *
 * Покрывают все утилиты для скачивания и обработки файлов.
 * Используют реальные file system операции в изолированных временных директориях.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileDownloadUtil } from '#tracker_api/utils/file-download.util.js';

describe('FileDownloadUtil', () => {
  describe('bufferToBase64', () => {
    it('should convert buffer to base64 string', () => {
      const buffer = Buffer.from('Hello World');
      const result = FileDownloadUtil.bufferToBase64(buffer);
      expect(result).toBe('SGVsbG8gV29ybGQ=');
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('');
      const result = FileDownloadUtil.bufferToBase64(buffer);
      expect(result).toBe('');
    });

    it('should handle buffer with binary data', () => {
      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const result = FileDownloadUtil.bufferToBase64(buffer);
      expect(result).toBe('SGVsbG8=');
    });

    it('should produce valid base64 string', () => {
      const buffer = Buffer.from('Test data 123');
      const result = FileDownloadUtil.bufferToBase64(buffer);
      // Base64 должен содержать только допустимые символы
      expect(result).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
    });
  });

  describe('base64ToBuffer', () => {
    it('should convert valid base64 string to buffer', () => {
      const base64 = 'SGVsbG8gV29ybGQ=';
      const result = FileDownloadUtil.base64ToBuffer(base64);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello World');
    });

    it('should handle empty base64 string', () => {
      const result = FileDownloadUtil.base64ToBuffer('');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(0);
    });

    it('should handle invalid base64 string gracefully', () => {
      // Node.js Buffer.from с base64 игнорирует невалидные символы
      const result = FileDownloadUtil.base64ToBuffer('invalid!!!base64');
      expect(result).toBeInstanceOf(Buffer);
      // Проверяем, что результат - Buffer (даже если некорректный)
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should support round-trip conversion', () => {
      const original = Buffer.from('Round trip test');
      const base64 = FileDownloadUtil.bufferToBase64(original);
      const result = FileDownloadUtil.base64ToBuffer(base64);
      expect(result).toEqual(original);
    });

    it('should handle base64 with padding', () => {
      const base64 = 'dGVzdA=='; // "test"
      const result = FileDownloadUtil.base64ToBuffer(base64);
      expect(result.toString()).toBe('test');
    });
  });

  describe('saveBufferToFile', () => {
    let tempDir: string;

    beforeEach(async () => {
      // Создаем временную директорию для каждого теста
      tempDir = await fs.mkdtemp(join(tmpdir(), 'file-download-test-'));
    });

    afterEach(async () => {
      // Очищаем временную директорию после каждого теста
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Игнорируем ошибки при очистке
      }
    });

    it('should save buffer to file in existing directory', async () => {
      const buffer = Buffer.from('Test content');
      const filePath = join(tempDir, 'test.txt');

      await FileDownloadUtil.saveBufferToFile(buffer, filePath);

      const content = await fs.readFile(filePath);
      expect(content).toEqual(buffer);
    });

    it('should create nested directories if they do not exist', async () => {
      const buffer = Buffer.from('Nested content');
      const filePath = join(tempDir, 'nested', 'deep', 'file.txt');

      await FileDownloadUtil.saveBufferToFile(buffer, filePath);

      // Проверяем, что файл создан
      const content = await fs.readFile(filePath);
      expect(content).toEqual(buffer);

      // Проверяем, что директории созданы
      const stats = await fs.stat(join(tempDir, 'nested', 'deep'));
      expect(stats.isDirectory()).toBe(true);
    });

    it('should save empty buffer', async () => {
      const buffer = Buffer.from('');
      const filePath = join(tempDir, 'empty.txt');

      await FileDownloadUtil.saveBufferToFile(buffer, filePath);

      const stats = await fs.stat(filePath);
      expect(stats.size).toBe(0);
    });

    it('should overwrite existing file', async () => {
      const filePath = join(tempDir, 'overwrite.txt');

      // Создаем файл с содержимым A
      await fs.writeFile(filePath, 'Content A');

      // Перезаписываем содержимым B
      const bufferB = Buffer.from('Content B');
      await FileDownloadUtil.saveBufferToFile(bufferB, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Content B');
    });

    it('should save binary data correctly', async () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
      const filePath = join(tempDir, 'binary.dat');

      await FileDownloadUtil.saveBufferToFile(buffer, filePath);

      const content = await fs.readFile(filePath);
      expect(content).toEqual(buffer);
    });

    it('should handle paths with special characters', async () => {
      const buffer = Buffer.from('Special chars');
      const filePath = join(tempDir, 'file with spaces.txt');

      await FileDownloadUtil.saveBufferToFile(buffer, filePath);

      const content = await fs.readFile(filePath);
      expect(content).toEqual(buffer);
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(FileDownloadUtil.getFileExtension('document.pdf')).toBe('pdf');
    });

    it('should extract last extension from filename with multiple dots', () => {
      expect(FileDownloadUtil.getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return empty string for filename without extension', () => {
      expect(FileDownloadUtil.getFileExtension('README')).toBe('');
    });

    it('should return empty string for filename ending with dot', () => {
      expect(FileDownloadUtil.getFileExtension('file.')).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(FileDownloadUtil.getFileExtension('')).toBe('');
    });

    it('should handle hidden files (starting with dot)', () => {
      expect(FileDownloadUtil.getFileExtension('.gitignore')).toBe('gitignore');
    });

    it('should extract extension from path with directories', () => {
      expect(FileDownloadUtil.getFileExtension('/path/to/file.txt')).toBe('txt');
    });

    it('should extract extension from Windows path', () => {
      expect(FileDownloadUtil.getFileExtension('C:\\Users\\file.docx')).toBe('docx');
    });

    it('should convert extension to lowercase', () => {
      expect(FileDownloadUtil.getFileExtension('photo.JPG')).toBe('jpg');
    });

    it('should handle mixed case extension', () => {
      expect(FileDownloadUtil.getFileExtension('image.PnG')).toBe('png');
    });

    it('should handle file with no base name', () => {
      expect(FileDownloadUtil.getFileExtension('.env')).toBe('env');
    });
  });

  describe('isImage', () => {
    it('should return true for valid image MIME types', () => {
      expect(FileDownloadUtil.isImage('image/png')).toBe(true);
      expect(FileDownloadUtil.isImage('image/jpeg')).toBe(true);
      expect(FileDownloadUtil.isImage('image/gif')).toBe(true);
      expect(FileDownloadUtil.isImage('image/webp')).toBe(true);
      expect(FileDownloadUtil.isImage('image/svg+xml')).toBe(true);
      expect(FileDownloadUtil.isImage('image/bmp')).toBe(true);
    });

    it('should return false for non-image MIME types', () => {
      expect(FileDownloadUtil.isImage('application/pdf')).toBe(false);
      expect(FileDownloadUtil.isImage('text/plain')).toBe(false);
      expect(FileDownloadUtil.isImage('video/mp4')).toBe(false);
      expect(FileDownloadUtil.isImage('application/json')).toBe(false);
      expect(FileDownloadUtil.isImage('audio/mpeg')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(FileDownloadUtil.isImage('')).toBe(false);
    });

    it('should handle MIME type with parameters', () => {
      expect(FileDownloadUtil.isImage('image/png; charset=utf-8')).toBe(true);
    });

    it('should be case-sensitive for standard MIME types', () => {
      // MIME типы по стандарту должны быть в нижнем регистре
      // но метод startsWith() чувствителен к регистру
      expect(FileDownloadUtil.isImage('IMAGE/PNG')).toBe(false);
    });
  });

  describe('isImageByExtension', () => {
    it('should return true for known image extensions', () => {
      expect(FileDownloadUtil.isImageByExtension('photo.jpg')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('image.png')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('icon.gif')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('logo.svg')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('pic.webp')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('photo.jpeg')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('bitmap.bmp')).toBe(true);
    });

    it('should return false for non-image extensions', () => {
      expect(FileDownloadUtil.isImageByExtension('document.pdf')).toBe(false);
      expect(FileDownloadUtil.isImageByExtension('text.txt')).toBe(false);
      expect(FileDownloadUtil.isImageByExtension('video.mp4')).toBe(false);
      expect(FileDownloadUtil.isImageByExtension('archive.zip')).toBe(false);
    });

    it('should return false for file without extension', () => {
      expect(FileDownloadUtil.isImageByExtension('README')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(FileDownloadUtil.isImageByExtension('photo.JPG')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('image.PNG')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('photo.JpG')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(FileDownloadUtil.isImageByExtension('')).toBe(false);
    });

    it('should check last extension for files with multiple dots', () => {
      expect(FileDownloadUtil.isImageByExtension('image.backup.png')).toBe(true);
      expect(FileDownloadUtil.isImageByExtension('archive.tar.gz')).toBe(false);
    });

    it('should handle paths with directories', () => {
      expect(FileDownloadUtil.isImageByExtension('/path/to/image.jpg')).toBe(true);
    });
  });

  describe('Integration tests', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(join(tmpdir(), 'integration-test-'));
    });

    afterEach(async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Игнорируем ошибки при очистке
      }
    });

    it('should save image and verify type by extension', async () => {
      const buffer = Buffer.from('fake image data');
      const filePath = join(tempDir, 'photo.jpg');

      await FileDownloadUtil.saveBufferToFile(buffer, filePath);

      expect(FileDownloadUtil.isImageByExtension(filePath)).toBe(true);

      const content = await fs.readFile(filePath);
      expect(content).toEqual(buffer);
    });

    it('should perform base64 to buffer to file conversion', async () => {
      const base64 = 'VGVzdCBpbWFnZSBkYXRh'; // "Test image data"
      const buffer = FileDownloadUtil.base64ToBuffer(base64);
      const filePath = join(tempDir, 'converted.png');

      await FileDownloadUtil.saveBufferToFile(buffer, filePath);

      const savedContent = await fs.readFile(filePath, 'utf-8');
      expect(savedContent).toBe('Test image data');
    });

    it('should verify MIME and extension consistency', () => {
      const imageFiles = [
        { filename: 'photo.jpg', mime: 'image/jpeg' },
        { filename: 'icon.png', mime: 'image/png' },
        { filename: 'logo.gif', mime: 'image/gif' },
      ];

      imageFiles.forEach(({ filename, mime }) => {
        const isByExtension = FileDownloadUtil.isImageByExtension(filename);
        const isByMime = FileDownloadUtil.isImage(mime);
        expect(isByExtension).toBe(true);
        expect(isByMime).toBe(true);
      });
    });

    it('should handle full download workflow', async () => {
      // Simulate API response with base64 content
      const originalData = 'Downloaded file content';
      const buffer = Buffer.from(originalData);
      const base64 = FileDownloadUtil.bufferToBase64(buffer);

      // Convert back to buffer
      const downloadedBuffer = FileDownloadUtil.base64ToBuffer(base64);

      // Save to file
      const filePath = join(tempDir, 'downloads', 'file.txt');
      await FileDownloadUtil.saveBufferToFile(downloadedBuffer, filePath);

      // Verify
      const savedContent = await fs.readFile(filePath, 'utf-8');
      expect(savedContent).toBe(originalData);
    });

    it('should handle image detection edge cases', () => {
      // Файлы, которые могут быть изображениями по расширению, но не по MIME
      expect(FileDownloadUtil.isImageByExtension('photo.jpg')).toBe(true);
      expect(FileDownloadUtil.isImage('application/octet-stream')).toBe(false);

      // Файлы без расширения
      expect(FileDownloadUtil.isImageByExtension('thumbnail')).toBe(false);
    });
  });
});
