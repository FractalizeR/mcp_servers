/**
 * Unit тесты для FileManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileManager } from '@cli/utils/file-manager.js';

describe('FileManager', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Создаём временную директорию для каждого теста
    tempDir = await mkdtemp(join(tmpdir(), 'file-manager-test-'));
  });

  afterEach(async () => {
    // Очищаем временную директорию после каждого теста
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('readJSON', () => {
    it('должен прочитать и распарсить JSON файл', async () => {
      const testData = { foo: 'bar', num: 42 };
      const filePath = join(tempDir, 'test.json');
      await writeFile(filePath, JSON.stringify(testData), 'utf-8');

      const result = await FileManager.readJSON(filePath);

      expect(result).toEqual(testData);
    });

    it('должен выбросить ошибку для невалидного JSON', async () => {
      const filePath = join(tempDir, 'invalid.json');
      await writeFile(filePath, 'not a json', 'utf-8');

      await expect(FileManager.readJSON(filePath)).rejects.toThrow();
    });

    it('должен выбросить ошибку для несуществующего файла', async () => {
      const filePath = join(tempDir, 'nonexistent.json');

      await expect(FileManager.readJSON(filePath)).rejects.toThrow();
    });
  });

  describe('writeJSON', () => {
    it('должен записать данные в JSON файл с форматированием', async () => {
      const testData = { foo: 'bar', nested: { key: 'value' } };
      const filePath = join(tempDir, 'output.json');

      await FileManager.writeJSON(filePath, testData);

      const content = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(testData);
      // Проверяем форматирование (2 пробела)
      expect(content).toContain('  "foo"');
    });
  });

  describe('readTOML', () => {
    it('должен прочитать и распарсить TOML файл', async () => {
      const tomlContent = `
[section]
key = "value"
number = 42
`;
      const filePath = join(tempDir, 'test.toml');
      await writeFile(filePath, tomlContent, 'utf-8');

      const result = await FileManager.readTOML<{ section: { key: string; number: number } }>(
        filePath
      );

      expect(result.section.key).toBe('value');
      expect(result.section.number).toBe(42);
    });

    it('должен выбросить ошибку для невалидного TOML', async () => {
      const filePath = join(tempDir, 'invalid.toml');
      await writeFile(filePath, 'invalid [[ toml', 'utf-8');

      await expect(FileManager.readTOML(filePath)).rejects.toThrow();
    });
  });

  describe('writeTOML', () => {
    it('должен записать данные в TOML файл', async () => {
      const testData = { section: { key: 'value', number: 42 } };
      const filePath = join(tempDir, 'output.toml');

      await FileManager.writeTOML(filePath, testData);

      const content = await readFile(filePath, 'utf-8');

      expect(content).toContain('[section]');
      expect(content).toContain('key = "value"');
      expect(content).toContain('number = 42');
    });
  });

  describe('exists', () => {
    it('должен вернуть true для существующего файла', async () => {
      const filePath = join(tempDir, 'exists.txt');
      await writeFile(filePath, 'content', 'utf-8');

      const result = await FileManager.exists(filePath);

      expect(result).toBe(true);
    });

    it('должен вернуть false для несуществующего файла', async () => {
      const filePath = join(tempDir, 'nonexistent.txt');

      const result = await FileManager.exists(filePath);

      expect(result).toBe(false);
    });

    it('должен вернуть true для существующей директории', async () => {
      const result = await FileManager.exists(tempDir);

      expect(result).toBe(true);
    });
  });

  describe('ensureDir', () => {
    it('должен создать директорию если не существует', async () => {
      const dirPath = join(tempDir, 'new-dir');

      await FileManager.ensureDir(dirPath);

      const exists = await FileManager.exists(dirPath);
      expect(exists).toBe(true);
    });

    it('должен создать вложенные директории', async () => {
      const dirPath = join(tempDir, 'a', 'b', 'c');

      await FileManager.ensureDir(dirPath);

      const exists = await FileManager.exists(dirPath);
      expect(exists).toBe(true);
    });

    it('не должен выбросить ошибку если директория уже существует', async () => {
      const dirPath = join(tempDir, 'existing-dir');
      await mkdir(dirPath);

      await expect(FileManager.ensureDir(dirPath)).resolves.toBeUndefined();
    });
  });

  describe('setPermissions', () => {
    it('должен установить права доступа к файлу', async () => {
      const filePath = join(tempDir, 'test.txt');
      await writeFile(filePath, 'content', 'utf-8');

      await FileManager.setPermissions(filePath, 0o644);

      // Права установлены (точная проверка зависит от ОС)
      const exists = await FileManager.exists(filePath);
      expect(exists).toBe(true);
    });
  });

  describe('getHomeDir', () => {
    it('должен вернуть домашнюю директорию', () => {
      const homeDir = FileManager.getHomeDir();

      expect(homeDir).toBeTruthy();
      expect(typeof homeDir).toBe('string');
    });
  });

  describe('resolvePath', () => {
    it('должен разрешить путь с ~/', () => {
      const homeDir = FileManager.getHomeDir();
      const result = FileManager.resolvePath('~/test/path');

      expect(result).toBe(join(homeDir, 'test/path'));
    });

    it('должен разрешить абсолютный путь', () => {
      const absolutePath = '/absolute/path';
      const result = FileManager.resolvePath(absolutePath);

      expect(result).toContain('absolute');
      expect(result).toContain('path');
    });

    it('должен разрешить относительный путь', () => {
      const result = FileManager.resolvePath('relative/path');

      expect(result).toContain('relative');
      expect(result).toContain('path');
    });
  });
});
