/**
 * Тесты FileManager на реальных tmp-файлах.
 *
 * Не используем моки — операции читают/пишут tmpdir в реальной FS.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FileManager } from '../../../src/utils/file-manager.js';

describe('FileManager', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fm-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('JSON', () => {
    it('writeJSON + readJSON: roundtrip', async () => {
      const p = path.join(tmpDir, 'cfg.json');
      const data = { foo: 'bar', n: 42, list: [1, 2, 3] };
      await FileManager.writeJSON(p, data);
      const read = await FileManager.readJSON<typeof data>(p);
      expect(read).toEqual(data);
    });

    it('readJSON бросает при битом JSON', async () => {
      const p = path.join(tmpDir, 'bad.json');
      await fs.writeFile(p, '{ not json', 'utf-8');
      await expect(FileManager.readJSON(p)).rejects.toThrow();
    });

    it('readJSON бросает при отсутствии файла', async () => {
      await expect(FileManager.readJSON('/nonexistent.json')).rejects.toThrow();
    });
  });

  describe('TOML', () => {
    it('writeTOML + readTOML: roundtrip', async () => {
      const p = path.join(tmpDir, 'cfg.toml');
      const data = { mcp_servers: { foo: { command: 'node', args: ['/x.cjs'], env: {} } } };
      await FileManager.writeTOML(p, data);
      const read = await FileManager.readTOML<typeof data>(p);
      expect(read).toEqual(data);
    });

    it('readTOML бросает при битом TOML', async () => {
      const p = path.join(tmpDir, 'bad.toml');
      await fs.writeFile(p, '[[[invalid', 'utf-8');
      await expect(FileManager.readTOML(p)).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('true для существующего файла', async () => {
      const p = path.join(tmpDir, 'a.txt');
      await fs.writeFile(p, 'x', 'utf-8');
      expect(await FileManager.exists(p)).toBe(true);
    });

    it('false для несуществующего файла', async () => {
      expect(await FileManager.exists('/nonexistent/zzz')).toBe(false);
    });
  });

  describe('ensureDir', () => {
    it('создаёт директорию рекурсивно', async () => {
      const p = path.join(tmpDir, 'a/b/c');
      await FileManager.ensureDir(p);
      const stat = await fs.stat(p);
      expect(stat.isDirectory()).toBe(true);
    });

    it('noop если директория уже существует', async () => {
      const p = path.join(tmpDir, 'a');
      await fs.mkdir(p);
      await expect(FileManager.ensureDir(p)).resolves.toBeUndefined();
    });
  });

  describe('setPermissions', () => {
    it('устанавливает права доступа', async () => {
      const p = path.join(tmpDir, 'file.txt');
      await fs.writeFile(p, 'x', 'utf-8');
      await FileManager.setPermissions(p, 0o600);
      const stat = await fs.stat(p);
      expect(stat.mode & 0o777).toBe(0o600);
    });
  });

  describe('getHomeDir', () => {
    it('возвращает HOME или USERPROFILE', () => {
      const home = FileManager.getHomeDir();
      expect(home).toBeTruthy();
    });
  });

  describe('resolvePath', () => {
    it('разрешает ~/ относительно HOME', () => {
      const oldHome = process.env['HOME'];
      process.env['HOME'] = '/myhome';
      try {
        expect(FileManager.resolvePath('~/foo.txt')).toBe(path.join('/myhome', 'foo.txt'));
      } finally {
        if (oldHome === undefined) delete process.env['HOME'];
        else process.env['HOME'] = oldHome;
      }
    });

    it('обычный путь резолвится через path.resolve', () => {
      const p = FileManager.resolvePath('./test.txt');
      expect(path.isAbsolute(p)).toBe(true);
    });
  });
});
