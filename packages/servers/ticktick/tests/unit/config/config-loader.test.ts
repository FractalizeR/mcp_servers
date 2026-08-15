/**
 * Unit tests for config-loader.ts
 *
 * Coverage focus: config-loader.ts started at 0% branch coverage — every
 * env-var driven decision (missing/invalid/boundary values, deprecated vars,
 * disabled tool group parsing) was untested. A wrong decision here means the
 * server silently starts with the wrong configuration, so every branch that
 * decides between "use provided value" and "fall back to default/throw" is
 * covered with a named scenario, not just exercised for the percentage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadConfig, resolveLogsDir } from '#config/config-loader.js';
import {
  ENV_VAR_NAMES,
  DEFAULT_API_BASE_URL,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  DEFAULT_MAX_BATCH_SIZE,
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  DEFAULT_LOGS_DIR,
  DEFAULT_LOG_MAX_SIZE,
  DEFAULT_LOG_MAX_FILES,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_MIN_DELAY,
  DEFAULT_RETRY_MAX_DELAY,
  DEFAULT_CACHE_TTL_MS,
  SERVER_NAME,
} from '#config/constants.js';

/** All env var names the loader reads — used to guarantee a clean slate. */
const MANAGED_ENV_KEYS = [
  ...Object.values(ENV_VAR_NAMES),
  'TOOL_DISCOVERY_MODE',
  'ESSENTIAL_TOOLS',
  'XDG_CACHE_HOME',
];

describe('config-loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const key of MANAGED_ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function setValidOAuthEnv(): void {
    process.env[ENV_VAR_NAMES.TICKTICK_ACCESS_TOKEN] = 'test-access-token';
  }

  describe('OAuth credential validation', () => {
    it('throws when neither accessToken nor client credentials are set', () => {
      expect(() => loadConfig()).toThrow(
        /Either TICKTICK_ACCESS_TOKEN or both TICKTICK_CLIENT_ID and TICKTICK_CLIENT_SECRET must be set/
      );
    });

    it('throws when only clientId is set without clientSecret', () => {
      process.env[ENV_VAR_NAMES.TICKTICK_CLIENT_ID] = 'client-id';
      expect(() => loadConfig()).toThrow();
    });

    it('throws when only clientSecret is set without clientId', () => {
      process.env[ENV_VAR_NAMES.TICKTICK_CLIENT_SECRET] = 'client-secret';
      expect(() => loadConfig()).toThrow();
    });

    it('succeeds with accessToken only, leaving client credentials empty', () => {
      setValidOAuthEnv();
      const config = loadConfig();
      expect(config.oauth.accessToken).toBe('test-access-token');
      expect(config.oauth.clientId).toBe('');
      expect(config.oauth.clientSecret).toBe('');
      expect(config.oauth.refreshToken).toBeUndefined();
    });

    it('succeeds with clientId+clientSecret only (no accessToken)', () => {
      process.env[ENV_VAR_NAMES.TICKTICK_CLIENT_ID] = 'client-id';
      process.env[ENV_VAR_NAMES.TICKTICK_CLIENT_SECRET] = 'client-secret';
      const config = loadConfig();
      expect(config.oauth.clientId).toBe('client-id');
      expect(config.oauth.clientSecret).toBe('client-secret');
      expect(config.oauth.accessToken).toBeUndefined();
    });

    it('trims access/refresh tokens and includes refreshToken when non-blank', () => {
      process.env[ENV_VAR_NAMES.TICKTICK_ACCESS_TOKEN] = '  token  ';
      process.env[ENV_VAR_NAMES.TICKTICK_REFRESH_TOKEN] = '  refresh  ';
      const config = loadConfig();
      expect(config.oauth.accessToken).toBe('token');
      expect(config.oauth.refreshToken).toBe('refresh');
    });

    it('omits refreshToken when it is blank after trimming', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.TICKTICK_REFRESH_TOKEN] = '   ';
      const config = loadConfig();
      expect(config.oauth.refreshToken).toBeUndefined();
    });

    it('uses the default redirectUri when not set', () => {
      setValidOAuthEnv();
      expect(loadConfig().oauth.redirectUri).toBe('http://localhost:3000/callback');
    });

    it('uses a custom, trimmed redirectUri when set', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.TICKTICK_REDIRECT_URI] = '  https://example.com/cb  ';
      expect(loadConfig().oauth.redirectUri).toBe('https://example.com/cb');
    });

    it('falls back to the default redirectUri when set to an empty/blank string', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.TICKTICK_REDIRECT_URI] = '   ';
      expect(loadConfig().oauth.redirectUri).toBe('http://localhost:3000/callback');
    });
  });

  describe('deprecated tool-discovery env vars', () => {
    it('warns on stderr for each deprecated var that is set, without affecting config', () => {
      setValidOAuthEnv();
      process.env['TOOL_DISCOVERY_MODE'] = 'lazy';
      process.env['ESSENTIAL_TOOLS'] = 'ping';
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = loadConfig();

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(String(errorSpy.mock.calls[0]?.[0])).toContain('TOOL_DISCOVERY_MODE');
      expect(String(errorSpy.mock.calls[1]?.[0])).toContain('ESSENTIAL_TOOLS');
      // Values are not read into the resulting config — no matching field exists.
      expect(config.tools.disabledGroups).toBeUndefined();

      errorSpy.mockRestore();
    });

    it('does not warn when deprecated vars are unset', () => {
      setValidOAuthEnv();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      loadConfig();

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('API base URL', () => {
    it('uses the default base URL when unset', () => {
      setValidOAuthEnv();
      expect(loadConfig().api.baseUrl).toBe(DEFAULT_API_BASE_URL);
    });

    it('uses a custom, trimmed base URL when set', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.TICKTICK_API_BASE_URL] = '  https://custom.example/api  ';
      expect(loadConfig().api.baseUrl).toBe('https://custom.example/api');
    });

    it('falls back to default when base URL is blank', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.TICKTICK_API_BASE_URL] = '   ';
      expect(loadConfig().api.baseUrl).toBe(DEFAULT_API_BASE_URL);
    });
  });

  describe('request timeout validation (5000-120000 ms)', () => {
    it.each([
      ['unset', undefined, DEFAULT_REQUEST_TIMEOUT],
      ['non-numeric', 'not-a-number', DEFAULT_REQUEST_TIMEOUT],
      ['below minimum', '4999', DEFAULT_REQUEST_TIMEOUT],
      ['above maximum', '120001', DEFAULT_REQUEST_TIMEOUT],
      ['at minimum boundary', '5000', 5000],
      ['at maximum boundary', '120000', 120000],
      ['a valid mid-range value', '60000', 60000],
    ])('%s -> %s', (_label, envValue, expected) => {
      setValidOAuthEnv();
      if (envValue !== undefined) {
        process.env[ENV_VAR_NAMES.REQUEST_TIMEOUT] = envValue;
      }
      expect(loadConfig().requestTimeout).toBe(expected);
    });
  });

  describe('max batch size validation (1-1000)', () => {
    it.each([
      ['unset', undefined, DEFAULT_MAX_BATCH_SIZE],
      ['non-numeric', 'abc', DEFAULT_MAX_BATCH_SIZE],
      ['below minimum', '0', DEFAULT_MAX_BATCH_SIZE],
      ['above maximum', '1001', DEFAULT_MAX_BATCH_SIZE],
      ['at minimum boundary', '1', 1],
      ['at maximum boundary', '1000', 1000],
    ])('%s -> %s', (_label, envValue, expected) => {
      setValidOAuthEnv();
      if (envValue !== undefined) {
        process.env[ENV_VAR_NAMES.MAX_BATCH_SIZE] = envValue;
      }
      expect(loadConfig().batch.maxBatchSize).toBe(expected);
    });
  });

  describe('max concurrent requests validation (1-20)', () => {
    it.each([
      ['unset', undefined, DEFAULT_MAX_CONCURRENT_REQUESTS],
      ['non-numeric', 'abc', DEFAULT_MAX_CONCURRENT_REQUESTS],
      ['below minimum', '0', DEFAULT_MAX_CONCURRENT_REQUESTS],
      ['above maximum', '21', DEFAULT_MAX_CONCURRENT_REQUESTS],
      ['at minimum boundary', '1', 1],
      ['at maximum boundary', '20', 20],
    ])('%s -> %s', (_label, envValue, expected) => {
      setValidOAuthEnv();
      if (envValue !== undefined) {
        process.env[ENV_VAR_NAMES.MAX_CONCURRENT_REQUESTS] = envValue;
      }
      expect(loadConfig().batch.maxConcurrentRequests).toBe(expected);
    });
  });

  describe('retry configuration', () => {
    it.each([
      ['unset', undefined, DEFAULT_RETRY_ATTEMPTS],
      ['non-numeric', 'abc', DEFAULT_RETRY_ATTEMPTS],
      ['below minimum (negative)', '-1', DEFAULT_RETRY_ATTEMPTS],
      ['above maximum', '11', DEFAULT_RETRY_ATTEMPTS],
      ['at minimum boundary (0 retries allowed)', '0', 0],
      ['at maximum boundary', '10', 10],
    ])('attempts: %s -> %s', (_label, envValue, expected) => {
      setValidOAuthEnv();
      if (envValue !== undefined) {
        process.env[ENV_VAR_NAMES.RETRY_ATTEMPTS] = envValue;
      }
      expect(loadConfig().retry.attempts).toBe(expected);
    });

    it.each([
      ['unset', undefined, DEFAULT_RETRY_MIN_DELAY],
      ['below minimum', '50', DEFAULT_RETRY_MIN_DELAY],
      ['above maximum', '5001', DEFAULT_RETRY_MIN_DELAY],
      ['at minimum boundary', '100', 100],
      ['at maximum boundary', '5000', 5000],
    ])('minDelay: %s -> %s', (_label, envValue, expected) => {
      setValidOAuthEnv();
      if (envValue !== undefined) {
        process.env[ENV_VAR_NAMES.RETRY_MIN_DELAY] = envValue;
      }
      expect(loadConfig().retry.minDelay).toBe(expected);
    });

    it.each([
      ['unset', undefined, DEFAULT_RETRY_MAX_DELAY],
      ['below minimum', '999', DEFAULT_RETRY_MAX_DELAY],
      ['above maximum', '60001', DEFAULT_RETRY_MAX_DELAY],
      ['at minimum boundary', '1000', 1000],
      ['at maximum boundary', '60000', 60000],
    ])('maxDelay: %s -> %s', (_label, envValue, expected) => {
      setValidOAuthEnv();
      if (envValue !== undefined) {
        process.env[ENV_VAR_NAMES.RETRY_MAX_DELAY] = envValue;
      }
      expect(loadConfig().retry.maxDelay).toBe(expected);
    });
  });

  describe('cache TTL validation (0-3600000 ms)', () => {
    it.each([
      ['unset', undefined, DEFAULT_CACHE_TTL_MS],
      ['non-numeric', 'abc', DEFAULT_CACHE_TTL_MS],
      ['negative', '-1', DEFAULT_CACHE_TTL_MS],
      ['above maximum (> 1 hour)', '3600001', DEFAULT_CACHE_TTL_MS],
      ['at minimum boundary (caching disabled)', '0', 0],
      ['at maximum boundary', '3600000', 3600000],
    ])('%s -> %s', (_label, envValue, expected) => {
      setValidOAuthEnv();
      if (envValue !== undefined) {
        process.env[ENV_VAR_NAMES.CACHE_TTL_MS] = envValue;
      }
      expect(loadConfig().cache.ttlMs).toBe(expected);
    });
  });

  describe('log level validation', () => {
    it.each([
      ['debug', 'debug'],
      ['info', 'info'],
      ['warn', 'warn'],
      ['error', 'error'],
      ['silent', 'silent'],
    ])('accepts valid level %s', (envValue, expected) => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.LOG_LEVEL] = envValue;
      expect(loadConfig().logging.level).toBe(expected);
    });

    it('falls back to default level for an unrecognized value', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.LOG_LEVEL] = 'verbose';
      expect(loadConfig().logging.level).toBe(DEFAULT_LOG_LEVEL);
    });

    it('falls back to default level when unset', () => {
      setValidOAuthEnv();
      expect(loadConfig().logging.level).toBe(DEFAULT_LOG_LEVEL);
    });
  });

  describe('logging config (pretty logs, size, files)', () => {
    it('enables prettyLogs only when the value is exactly "true"', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.PRETTY_LOGS] = 'true';
      expect(loadConfig().logging.prettyLogs).toBe(true);
    });

    it.each(['false', 'yes', '1', ''])('disables prettyLogs for non-"true" value %s', (value) => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.PRETTY_LOGS] = value;
      expect(loadConfig().logging.prettyLogs).toBe(false);
    });

    it('disables prettyLogs when unset', () => {
      setValidOAuthEnv();
      expect(loadConfig().logging.prettyLogs).toBe(false);
    });

    it('uses default maxSize/maxFiles when unset', () => {
      setValidOAuthEnv();
      const config = loadConfig();
      expect(config.logging.maxSize).toBe(DEFAULT_LOG_MAX_SIZE);
      expect(config.logging.maxFiles).toBe(DEFAULT_LOG_MAX_FILES);
    });

    it('parses custom maxSize/maxFiles from env', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.LOG_MAX_SIZE] = '102400';
      process.env[ENV_VAR_NAMES.LOG_MAX_FILES] = '5';
      const config = loadConfig();
      expect(config.logging.maxSize).toBe(102400);
      expect(config.logging.maxFiles).toBe(5);
    });
  });

  describe('disabled tool groups parsing', () => {
    it('returns undefined when unset', () => {
      setValidOAuthEnv();
      expect(loadConfig().tools.disabledGroups).toBeUndefined();
    });

    it('returns undefined for an empty/blank value', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = '   ';
      expect(loadConfig().tools.disabledGroups).toBeUndefined();
    });

    it('parses a whole-category entry', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = 'projects';
      const groups = loadConfig().tools.disabledGroups;
      expect(groups?.categories.has('projects')).toBe(true);
      expect(groups?.categoriesWithSubcategories.size).toBe(0);
      expect(groups?.includeAll).toBe(false);
    });

    it('parses a category:subcategory entry', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = 'tasks:date';
      const groups = loadConfig().tools.disabledGroups;
      expect(groups?.categoriesWithSubcategories.get('tasks')?.has('date')).toBe(true);
    });

    it('parses multiple comma-separated entries, combining categories and subcategories', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = 'helpers:gtd,tasks:date,projects';
      const groups = loadConfig().tools.disabledGroups;
      expect(groups?.categoriesWithSubcategories.get('helpers')?.has('gtd')).toBe(true);
      expect(groups?.categoriesWithSubcategories.get('tasks')?.has('date')).toBe(true);
      expect(groups?.categories.has('projects')).toBe(true);
    });

    it('accumulates multiple subcategories under the same category', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = 'tasks:date,tasks:write';
      const groups = loadConfig().tools.disabledGroups;
      const tasksSubcats = groups?.categoriesWithSubcategories.get('tasks');
      expect(tasksSubcats?.has('date')).toBe(true);
      expect(tasksSubcats?.has('write')).toBe(true);
    });

    it('trims whitespace and lowercases category/subcategory names', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = '  Tasks : Read  , Projects ';
      const groups = loadConfig().tools.disabledGroups;
      expect(groups?.categoriesWithSubcategories.get('tasks')?.has('read')).toBe(true);
      expect(groups?.categories.has('projects')).toBe(true);
    });

    it('skips entries with more than one colon (invalid format)', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = 'a:b:c,tasks:read';
      const groups = loadConfig().tools.disabledGroups;
      expect(groups?.categoriesWithSubcategories.has('a')).toBe(false);
      expect(groups?.categoriesWithSubcategories.get('tasks')?.has('read')).toBe(true);
    });

    it('skips entries with an empty category segment', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = ':sub,tasks:read';
      const groups = loadConfig().tools.disabledGroups;
      expect(groups?.categoriesWithSubcategories.get('tasks')?.has('read')).toBe(true);
      expect(groups?.categoriesWithSubcategories.size).toBe(1);
    });

    it('skips entries with an empty subcategory segment', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = 'cat:,tasks:read';
      const groups = loadConfig().tools.disabledGroups;
      expect(groups?.categoriesWithSubcategories.has('cat')).toBe(false);
      expect(groups?.categoriesWithSubcategories.get('tasks')?.has('read')).toBe(true);
    });

    it('returns undefined when every entry is invalid (nothing parsed)', () => {
      setValidOAuthEnv();
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = 'a:b:c,:x,y:,  ,';
      expect(loadConfig().tools.disabledGroups).toBeUndefined();
    });
  });

  describe('resolveLogsDir', () => {
    const projectRoot = '/project/root';
    const serverName = SERVER_NAME;
    const logsSubdir = DEFAULT_LOGS_DIR;

    it('falls back to XDG_CACHE_HOME/serverName/logsSubdir when env is unset', () => {
      process.env['XDG_CACHE_HOME'] = '/xdg/cache';
      const dir = resolveLogsDir(undefined, projectRoot, serverName, logsSubdir);
      expect(dir).toBe(join('/xdg/cache', serverName, logsSubdir));
    });

    it('falls back to ~/.cache/serverName/logsSubdir when neither env nor XDG_CACHE_HOME is set', () => {
      delete process.env['XDG_CACHE_HOME'];
      const dir = resolveLogsDir(undefined, projectRoot, serverName, logsSubdir);
      expect(dir).toBe(join(homedir(), '.cache', serverName, logsSubdir));
    });

    it('treats a blank logsDirEnv the same as unset', () => {
      delete process.env['XDG_CACHE_HOME'];
      const dir = resolveLogsDir('   ', projectRoot, serverName, logsSubdir);
      expect(dir).toBe(join(homedir(), '.cache', serverName, logsSubdir));
    });

    it('resolves a relative logsDirEnv against projectRoot', () => {
      const dir = resolveLogsDir('custom-logs', projectRoot, serverName, logsSubdir);
      expect(dir).toBe(resolve(projectRoot, 'custom-logs'));
    });

    it('resolves an absolute logsDirEnv to itself', () => {
      const dir = resolveLogsDir('/absolute/logs', projectRoot, serverName, logsSubdir);
      expect(dir).toBe('/absolute/logs');
    });

    it('expands a ~/ prefixed logsDirEnv relative to the home directory', () => {
      const dir = resolveLogsDir('~/my-logs', projectRoot, serverName, logsSubdir);
      expect(dir).toBe(join(homedir(), 'my-logs'));
    });
  });

  describe('loadConfig integration', () => {
    it('produces defaults across all sections when only required OAuth vars are set', () => {
      setValidOAuthEnv();
      const config = loadConfig();

      expect(config.api.baseUrl).toBe(DEFAULT_API_BASE_URL);
      expect(config.batch.maxBatchSize).toBe(DEFAULT_MAX_BATCH_SIZE);
      expect(config.batch.maxConcurrentRequests).toBe(DEFAULT_MAX_CONCURRENT_REQUESTS);
      expect(config.retry.attempts).toBe(DEFAULT_RETRY_ATTEMPTS);
      expect(config.cache.ttlMs).toBe(DEFAULT_CACHE_TTL_MS);
      expect(config.tools.disabledGroups).toBeUndefined();
      expect(config.logging.level).toBe(DEFAULT_LOG_LEVEL);
      expect(config.requestTimeout).toBe(DEFAULT_REQUEST_TIMEOUT);
    });

    it('honors a full set of custom env vars together', () => {
      process.env[ENV_VAR_NAMES.TICKTICK_CLIENT_ID] = 'id';
      process.env[ENV_VAR_NAMES.TICKTICK_CLIENT_SECRET] = 'secret';
      process.env[ENV_VAR_NAMES.TICKTICK_API_BASE_URL] = 'https://custom.example/api';
      process.env[ENV_VAR_NAMES.MAX_BATCH_SIZE] = '50';
      process.env[ENV_VAR_NAMES.MAX_CONCURRENT_REQUESTS] = '10';
      process.env[ENV_VAR_NAMES.RETRY_ATTEMPTS] = '5';
      process.env[ENV_VAR_NAMES.CACHE_TTL_MS] = '60000';
      process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS] = 'tasks:delete';
      process.env[ENV_VAR_NAMES.LOG_LEVEL] = 'debug';
      process.env[ENV_VAR_NAMES.REQUEST_TIMEOUT] = '45000';

      const config = loadConfig();

      expect(config.oauth.clientId).toBe('id');
      expect(config.api.baseUrl).toBe('https://custom.example/api');
      expect(config.batch.maxBatchSize).toBe(50);
      expect(config.batch.maxConcurrentRequests).toBe(10);
      expect(config.retry.attempts).toBe(5);
      expect(config.cache.ttlMs).toBe(60000);
      expect(
        config.tools.disabledGroups?.categoriesWithSubcategories.get('tasks')?.has('delete')
      ).toBe(true);
      expect(config.logging.level).toBe('debug');
      expect(config.requestTimeout).toBe(45000);
    });
  });
});
