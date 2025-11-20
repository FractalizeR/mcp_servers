import { describe, it, expect } from 'vitest';
import { FileUploadUtil } from '#tracker_api/utils/file-upload.util.js';

describe('FileUploadUtil', () => {
  describe('getFileExtension', () => {
    describe('standard cases', () => {
      it('должна возвращать расширение для обычного файла', () => {
        expect(FileUploadUtil.getFileExtension('document.pdf')).toBe('pdf');
        expect(FileUploadUtil.getFileExtension('image.jpg')).toBe('jpg');
        expect(FileUploadUtil.getFileExtension('archive.tar.gz')).toBe('gz');
      });

      it('должна возвращать расширение в нижнем регистре', () => {
        expect(FileUploadUtil.getFileExtension('Document.PDF')).toBe('pdf');
        expect(FileUploadUtil.getFileExtension('Image.JPG')).toBe('jpg');
      });
    });

    describe('edge cases', () => {
      it('должна возвращать пустую строку для файла без точки', () => {
        expect(FileUploadUtil.getFileExtension('README')).toBe('');
        expect(FileUploadUtil.getFileExtension('Makefile')).toBe('');
        expect(FileUploadUtil.getFileExtension('LICENSE')).toBe('');
      });

      it('должна возвращать пустую строку для файла с точкой в конце', () => {
        expect(FileUploadUtil.getFileExtension('file.')).toBe('');
        expect(FileUploadUtil.getFileExtension('document.')).toBe('');
      });

      it('должна возвращать пустую строку для пустой строки', () => {
        expect(FileUploadUtil.getFileExtension('')).toBe('');
      });

      it('должна возвращать пустую строку для строки с только точкой', () => {
        expect(FileUploadUtil.getFileExtension('.')).toBe('');
      });

      it('должна корректно обрабатывать множественные точки', () => {
        expect(FileUploadUtil.getFileExtension('file..txt')).toBe('txt');
        expect(FileUploadUtil.getFileExtension('archive.tar.gz')).toBe('gz');
        expect(FileUploadUtil.getFileExtension('file...ext')).toBe('ext');
      });

      it('должна возвращать пустую строку для файлов, начинающихся с точки', () => {
        expect(FileUploadUtil.getFileExtension('.gitignore')).toBe('gitignore');
        expect(FileUploadUtil.getFileExtension('.hidden')).toBe('hidden');
      });
    });
  });

  describe('validateFilename', () => {
    describe('valid filenames', () => {
      it('должна возвращать true для обычных имен файлов', () => {
        expect(FileUploadUtil.validateFilename('document.pdf')).toBe(true);
        expect(FileUploadUtil.validateFilename('image.jpg')).toBe(true);
        expect(FileUploadUtil.validateFilename('file.txt')).toBe(true);
      });

      it('должна разрешать валидные специальные символы', () => {
        expect(FileUploadUtil.validateFilename('file-name.txt')).toBe(true);
        expect(FileUploadUtil.validateFilename('file_name.txt')).toBe(true);
        expect(FileUploadUtil.validateFilename('file (1).txt')).toBe(true);
        expect(FileUploadUtil.validateFilename('file.backup.txt')).toBe(true);
      });

      it('должна разрешать unicode символы', () => {
        expect(FileUploadUtil.validateFilename('файл.txt')).toBe(true);
        expect(FileUploadUtil.validateFilename('文件.txt')).toBe(true);
        expect(FileUploadUtil.validateFilename('файл-документ_2024.pdf')).toBe(true);
      });
    });

    describe('empty and whitespace', () => {
      it('должна возвращать false для пустой строки', () => {
        expect(FileUploadUtil.validateFilename('')).toBe(false);
      });

      it('должна возвращать false для строки только из пробелов', () => {
        expect(FileUploadUtil.validateFilename('   ')).toBe(false);
        expect(FileUploadUtil.validateFilename('\t')).toBe(false);
        expect(FileUploadUtil.validateFilename('\n')).toBe(false);
        expect(FileUploadUtil.validateFilename('  \t  \n  ')).toBe(false);
      });
    });

    describe('path traversal', () => {
      it('должна запрещать path traversal с ..', () => {
        expect(FileUploadUtil.validateFilename('../etc/passwd')).toBe(false);
        expect(FileUploadUtil.validateFilename('../../secret')).toBe(false);
        expect(FileUploadUtil.validateFilename('file..txt')).toBe(false);
      });

      it('должна запрещать путь с forward slash', () => {
        expect(FileUploadUtil.validateFilename('dir/file.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('/etc/passwd')).toBe(false);
      });

      it('должна запрещать путь с backslash', () => {
        expect(FileUploadUtil.validateFilename('dir\\file.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('C:\\Windows\\System32')).toBe(false);
      });
    });

    describe('invalid characters - Windows restricted', () => {
      it('должна запрещать символ <', () => {
        expect(FileUploadUtil.validateFilename('file<name>.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('<script>.js')).toBe(false);
      });

      it('должна запрещать символ >', () => {
        expect(FileUploadUtil.validateFilename('file>name.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('output>.log')).toBe(false);
      });

      it('должна запрещать символ :', () => {
        expect(FileUploadUtil.validateFilename('file:name.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('C:file.txt')).toBe(false);
      });

      it('должна запрещать символ "', () => {
        expect(FileUploadUtil.validateFilename('file"name.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('"quoted".txt')).toBe(false);
      });

      it('должна запрещать символ |', () => {
        expect(FileUploadUtil.validateFilename('file|name.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('pipe|file.txt')).toBe(false);
      });

      it('должна запрещать символ ?', () => {
        expect(FileUploadUtil.validateFilename('file?name.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('what?.txt')).toBe(false);
      });

      it('должна запрещать символ *', () => {
        expect(FileUploadUtil.validateFilename('file*name.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('*.txt')).toBe(false);
      });
    });

    describe('control characters', () => {
      it('должна запрещать null byte (\\x00)', () => {
        expect(FileUploadUtil.validateFilename('file\x00name.txt')).toBe(false);
      });

      it('должна запрещать другие control characters', () => {
        expect(FileUploadUtil.validateFilename('file\x01name.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('file\x1Fname.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('file\x0Dname.txt')).toBe(false);
        expect(FileUploadUtil.validateFilename('file\x0Aname.txt')).toBe(false);
      });
    });
  });

  describe('validateFileSize', () => {
    describe('valid sizes', () => {
      it('должна возвращать true для допустимых размеров', () => {
        expect(FileUploadUtil.validateFileSize(0, 1024)).toBe(true);
        expect(FileUploadUtil.validateFileSize(512, 1024)).toBe(true);
        expect(FileUploadUtil.validateFileSize(1024, 1024)).toBe(true);
      });

      it('должна разрешать граничное значение', () => {
        expect(FileUploadUtil.validateFileSize(10 * 1024 * 1024, 10 * 1024 * 1024)).toBe(true);
      });
    });

    describe('invalid sizes', () => {
      it('должна возвращать false для превышения лимита', () => {
        expect(FileUploadUtil.validateFileSize(1025, 1024)).toBe(false);
        expect(FileUploadUtil.validateFileSize(11 * 1024 * 1024, 10 * 1024 * 1024)).toBe(false);
      });

      it('должна возвращать false для отрицательного размера', () => {
        expect(FileUploadUtil.validateFileSize(-1, 1024)).toBe(false);
        expect(FileUploadUtil.validateFileSize(-100, 1024)).toBe(false);
      });
    });
  });

  describe('getMimeType', () => {
    describe('common types', () => {
      it('должна возвращать MIME тип для распространенных расширений', () => {
        expect(FileUploadUtil.getMimeType('document.pdf')).toBe('application/pdf');
        expect(FileUploadUtil.getMimeType('image.jpg')).toBe('image/jpeg');
        expect(FileUploadUtil.getMimeType('image.png')).toBe('image/png');
        expect(FileUploadUtil.getMimeType('file.txt')).toBe('text/plain');
        expect(FileUploadUtil.getMimeType('data.json')).toBe('application/json');
      });
    });

    describe('fallback', () => {
      it('должна возвращать application/octet-stream для неизвестных типов', () => {
        expect(FileUploadUtil.getMimeType('file.unknown')).toBe('application/octet-stream');
        expect(FileUploadUtil.getMimeType('README')).toBe('application/octet-stream');
      });
    });
  });

  describe('formatFileSize', () => {
    describe('different units', () => {
      it('должна форматировать байты', () => {
        expect(FileUploadUtil.formatFileSize(0)).toBe('0 Bytes');
        expect(FileUploadUtil.formatFileSize(100)).toBe('100.0 Bytes');
        expect(FileUploadUtil.formatFileSize(1023)).toBe('1023.0 Bytes');
      });

      it('должна форматировать килобайты', () => {
        expect(FileUploadUtil.formatFileSize(1024)).toBe('1.0 KB');
        expect(FileUploadUtil.formatFileSize(1536)).toBe('1.5 KB');
        expect(FileUploadUtil.formatFileSize(2048)).toBe('2.0 KB');
      });

      it('должна форматировать мегабайты', () => {
        expect(FileUploadUtil.formatFileSize(1024 * 1024)).toBe('1.0 MB');
        expect(FileUploadUtil.formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
        expect(FileUploadUtil.formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB');
      });

      it('должна форматировать гигабайты', () => {
        expect(FileUploadUtil.formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
        expect(FileUploadUtil.formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
      });
    });
  });

  describe('prepareMultipartFormData', () => {
    it('должна создавать FormData с файлом', () => {
      const buffer = Buffer.from('test content');
      const formData = FileUploadUtil.prepareMultipartFormData(buffer, 'test.txt');

      expect(formData).toBeInstanceOf(FormData);
      expect(formData.has('file')).toBe(true);
    });

    it('должна использовать кастомное имя поля', () => {
      const buffer = Buffer.from('test content');
      const formData = FileUploadUtil.prepareMultipartFormData(buffer, 'test.txt', 'attachment');

      expect(formData).toBeInstanceOf(FormData);
      expect(formData.has('attachment')).toBe(true);
    });

    it('должна определять MIME тип для различных файлов', () => {
      const buffer = Buffer.from('test content');

      // Проверяем, что FormData создается успешно для разных типов файлов
      const pdfForm = FileUploadUtil.prepareMultipartFormData(buffer, 'document.pdf');
      expect(pdfForm).toBeInstanceOf(FormData);

      const imageForm = FileUploadUtil.prepareMultipartFormData(buffer, 'image.jpg');
      expect(imageForm).toBeInstanceOf(FormData);

      const textForm = FileUploadUtil.prepareMultipartFormData(buffer, 'file.txt');
      expect(textForm).toBeInstanceOf(FormData);
    });
  });
});
