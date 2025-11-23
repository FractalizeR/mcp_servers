import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../../../src/utils/config-manager.js';
import type { BaseMCPServerConfig } from '../../../src/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestConfig extends BaseMCPServerConfig {
  token: string; // секрет
  orgId: string; // безопасно
}

describe('ConfigManager', () => {
  let configManager: ConfigManager<TestConfig>;
  let configPath: string;

  beforeEach(() => {
    configManager = new ConfigManager<TestConfig>({
      projectName: 'test_mcp_cli',
      safeFields: ['orgId', 'logLevel', 'projectPath'],
    });
    configPath = configManager.getConfigPath();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await configManager.delete();
      const configDir = path.dirname(configPath);
      await fs.rmdir(configDir);
    } catch {
      // ignore
    }
  });

  it('should save only safe fields', async () => {
    const config: TestConfig = {
      token: 'secret-token',
      orgId: 'my-org',
      projectPath: '/test',
      logLevel: 'info',
    };

    await configManager.save(config);

    const loaded = await configManager.load();
    expect(loaded).toBeDefined();
    expect(loaded?.orgId).toBe('my-org');
    expect(loaded?.logLevel).toBe('info');
    expect('token' in (loaded ?? {})).toBe(false); // token не сохранен
  });

  it('should return undefined if config does not exist', async () => {
    const loaded = await configManager.load();
    expect(loaded).toBeUndefined();
  });

  it('should delete config', async () => {
    const config: TestConfig = {
      token: 'secret',
      orgId: 'org',
      projectPath: '/test',
    };

    await configManager.save(config);
    expect(await configManager.exists()).toBe(true);

    await configManager.delete();
    expect(await configManager.exists()).toBe(false);
  });

  it('should use custom serialize function', async () => {
    const customManager = new ConfigManager<TestConfig>({
      projectName: 'test_mcp_cli_custom',
      safeFields: ['orgId', 'projectPath'],
      serialize: (config) => ({
        customOrgId: config.orgId,
        customPath: config.projectPath,
      }),
    });

    const config: TestConfig = {
      token: 'secret',
      orgId: 'my-org',
      projectPath: '/test',
    };

    await customManager.save(config);

    // Читаем напрямую файл чтобы проверить формат
    const rawData = await fs.readFile(customManager.getConfigPath(), 'utf-8');
    const parsed = JSON.parse(rawData) as Record<string, unknown>;

    expect(parsed).toHaveProperty('customOrgId', 'my-org');
    expect(parsed).toHaveProperty('customPath', '/test');

    // Cleanup
    await customManager.delete();
    const configDir = path.dirname(customManager.getConfigPath());
    await fs.rmdir(configDir).catch(() => {
      // ignore
    });
  });

  it('should use custom deserialize function', async () => {
    const customManager = new ConfigManager<TestConfig>({
      projectName: 'test_mcp_cli_deserialize',
      safeFields: ['orgId', 'projectPath'],
      deserialize: (data) => {
        // Проверяем что orgId существует
        if (typeof data.orgId === 'string' && data.orgId.length > 0) {
          return data as Partial<TestConfig>;
        }
        return undefined;
      },
    });

    const config: TestConfig = {
      token: 'secret',
      orgId: 'my-org',
      projectPath: '/test',
    };

    await customManager.save(config);

    const loaded = await customManager.load();
    expect(loaded).toBeDefined();
    expect(loaded?.orgId).toBe('my-org');

    // Cleanup
    await customManager.delete();
    const configDir = path.dirname(customManager.getConfigPath());
    await fs.rmdir(configDir).catch(() => {
      // ignore
    });
  });

  it('should set file permissions to 0o600', async () => {
    const config: TestConfig = {
      token: 'secret',
      orgId: 'org',
      projectPath: '/test',
    };

    await configManager.save(config);

    const stats = await fs.stat(configPath);
     
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('should return config path', () => {
    const expectedPath = path.join(
      process.env['HOME'] ?? process.env['USERPROFILE'] ?? '',
      '.test_mcp_cli',
      'config.json'
    );
    expect(configPath).toBe(expectedPath);
  });

  it('should handle missing fields gracefully', async () => {
    const partialConfig = {
      token: 'secret',
      orgId: 'org',
      projectPath: '/test',
      // logLevel отсутствует
    } as TestConfig;

    await configManager.save(partialConfig);

    const loaded = await configManager.load();
    expect(loaded).toBeDefined();
    expect(loaded?.orgId).toBe('org');
    expect('logLevel' in (loaded ?? {})).toBe(false);
  });
});
