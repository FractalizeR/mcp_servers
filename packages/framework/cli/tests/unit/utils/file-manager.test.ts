import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileManager } from '../../../src/utils/file-manager.js';
import * as path from 'node:path';
import * as os from 'node:os';

describe('FileManager', () => {
  let testDir: string;
  let testFile: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-${Date.now()}`);
    testFile = path.join(testDir, 'test.json');
    await FileManager.ensureDir(testDir);
  });

  afterEach(async () => {
    const fs = await import('node:fs/promises');
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  it('should check if file exists', async () => {
    expect(await FileManager.exists(testFile)).toBe(false);
  });

  it('should read and write JSON', async () => {
    const data = { test: 'value' };
    await FileManager.writeJSON(testFile, data);

    const loaded = await FileManager.readJSON<typeof data>(testFile);
    expect(loaded).toEqual(data);
  });

  it('should get home directory', () => {
    const home = FileManager.getHomeDir();
    expect(home).toBeDefined();
    expect(home.length).toBeGreaterThan(0);
  });

  it('should ensure directory exists', async () => {
    const newDir = path.join(testDir, 'nested', 'deep', 'directory');
    await FileManager.ensureDir(newDir);
    expect(await FileManager.exists(newDir)).toBe(true);
  });

  it('should resolve path with tilde', () => {
    const resolved = FileManager.resolvePath('~/config.json');
    expect(resolved).toContain('config.json');
    expect(resolved).not.toContain('~');
  });

  it('should resolve absolute path as-is', () => {
    const absolutePath = '/tmp/test.json';
    const resolved = FileManager.resolvePath(absolutePath);
    expect(resolved).toBe(path.resolve(absolutePath));
  });

  it('should read and write TOML', async () => {
    const tomlFile = path.join(testDir, 'test.toml');
    const data = { server: { port: 3000, host: 'localhost' } };

    await FileManager.writeTOML(tomlFile, data);
    const loaded = await FileManager.readTOML<typeof data>(tomlFile);

    expect(loaded).toEqual(data);
  });

  it('should set file permissions', async () => {
    await FileManager.writeJSON(testFile, { test: 'data' });
    await expect(FileManager.setPermissions(testFile, 0o644)).resolves.toBeUndefined();
  });
});
