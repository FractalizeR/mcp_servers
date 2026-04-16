import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { resolveLogsDir } from '#config';

describe('resolveLogsDir', () => {
  const PROJECT_ROOT = '/fake/project/root';
  const SERVER_NAME = 'mcp-server-test';
  const LOGS_SUBDIR = 'logs';
  const originalXdg = process.env.XDG_CACHE_HOME;

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env.XDG_CACHE_HOME;
    } else {
      process.env.XDG_CACHE_HOME = originalXdg;
    }
  });

  describe('default (no env)', () => {
    beforeEach(() => {
      delete process.env.XDG_CACHE_HOME;
    });

    it('should use ~/.cache/<serverName>/logs when LOGS_DIR is not set', () => {
      const result = resolveLogsDir(undefined, PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(join(homedir(), '.cache', SERVER_NAME, LOGS_SUBDIR));
    });

    it('should use ~/.cache when LOGS_DIR is empty string', () => {
      const result = resolveLogsDir('', PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(join(homedir(), '.cache', SERVER_NAME, LOGS_SUBDIR));
    });

    it('should use ~/.cache when LOGS_DIR is whitespace only', () => {
      const result = resolveLogsDir('   ', PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(join(homedir(), '.cache', SERVER_NAME, LOGS_SUBDIR));
    });
  });

  describe('XDG_CACHE_HOME support', () => {
    it('should respect XDG_CACHE_HOME when set', () => {
      process.env.XDG_CACHE_HOME = '/custom/cache';
      const result = resolveLogsDir(undefined, PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(join('/custom/cache', SERVER_NAME, LOGS_SUBDIR));
    });

    it('should fall back to ~/.cache when XDG_CACHE_HOME is not set', () => {
      delete process.env.XDG_CACHE_HOME;
      const result = resolveLogsDir(undefined, PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(join(homedir(), '.cache', SERVER_NAME, LOGS_SUBDIR));
    });
  });

  describe('explicit LOGS_DIR (absolute path)', () => {
    it('should use absolute path as-is', () => {
      const result = resolveLogsDir('/var/log/mcp', PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe('/var/log/mcp');
    });
  });

  describe('explicit LOGS_DIR (relative path)', () => {
    it('should resolve relative path from PROJECT_ROOT', () => {
      const result = resolveLogsDir('custom-logs', PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(resolve(PROJECT_ROOT, 'custom-logs'));
    });

    it('should resolve ./logs from PROJECT_ROOT', () => {
      const result = resolveLogsDir('./logs', PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(resolve(PROJECT_ROOT, './logs'));
    });
  });

  describe('tilde expansion', () => {
    it('should expand ~/path to homedir/path', () => {
      const result = resolveLogsDir('~/my-logs', PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(join(homedir(), 'my-logs'));
    });

    it('should expand ~/nested/path correctly', () => {
      const result = resolveLogsDir('~/mcp/logs', PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(join(homedir(), 'mcp', 'logs'));
    });

    it('should not expand ~ without slash', () => {
      const result = resolveLogsDir('~logs', PROJECT_ROOT, SERVER_NAME, LOGS_SUBDIR);
      expect(result).toBe(resolve(PROJECT_ROOT, '~logs'));
    });
  });
});
