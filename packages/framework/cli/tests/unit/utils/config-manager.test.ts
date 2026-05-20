/**
 * Тесты ConfigManager.
 *
 * После Stage 1.1 убрали `safeFields` — единственный способ фильтрации это
 * `serialize` хук. Все тесты `safeFields` удалены.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConfigManager } from '../../../src/utils/config-manager.js';

interface YtConfig {
  token: string;
  orgId: string;
  apiBase?: string;
}

describe('ConfigManager', () => {
  let tmpHome: string;
  const projectName = `test_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`;
  let oldHome: string | undefined;
  let oldUserProfile: string | undefined;

  beforeEach(async () => {
    tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'cm-test-'));
    oldHome = process.env['HOME'];
    oldUserProfile = process.env['USERPROFILE'];
    process.env['HOME'] = tmpHome;
    process.env['USERPROFILE'] = tmpHome;
  });

  afterEach(async () => {
    if (oldHome === undefined) {
      delete process.env['HOME'];
    } else {
      process.env['HOME'] = oldHome;
    }
    if (oldUserProfile === undefined) {
      delete process.env['USERPROFILE'];
    } else {
      process.env['USERPROFILE'] = oldUserProfile;
    }
    await fs.rm(tmpHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // Identity serializer — "явное согласие сохранить всё как есть".
  const identitySerialize = (cfg: YtConfig): Record<string, unknown> => ({ ...cfg });

  describe('getConfigPath', () => {
    it('возвращает корректный путь ~/.{projectName}/config.json', () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      const p = cm.getConfigPath();
      expect(p).toBe(path.join(tmpHome, `.${projectName}`, 'config.json'));
    });
  });

  describe('save с identity serialize (явное согласие)', () => {
    it('записывает весь объект как результат identity serialize', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      await cm.save({ token: 'sec', orgId: 'org-1', apiBase: 'https://x' });

      const written = JSON.parse(await fs.readFile(cm.getConfigPath(), 'utf-8')) as unknown;
      expect(written).toEqual({ token: 'sec', orgId: 'org-1', apiBase: 'https://x' });
    });

    it('создаёт директорию если не существует', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      await cm.save({ token: 'sec', orgId: 'org-1' });

      // Файл должен существовать
      await expect(fs.access(cm.getConfigPath())).resolves.toBeUndefined();
    });
  });

  describe('save с serialize-хуком', () => {
    it('сохраняет результат serialize, не оригинал', async () => {
      const cm = new ConfigManager<YtConfig>({
        projectName,
        serialize: (cfg) => ({ orgId: cfg.orgId, apiBase: cfg.apiBase }),
      });
      await cm.save({ token: 'TOP_SECRET', orgId: 'org-1', apiBase: 'https://x' });

      const written = JSON.parse(await fs.readFile(cm.getConfigPath(), 'utf-8')) as unknown;
      expect(written).toEqual({ orgId: 'org-1', apiBase: 'https://x' });
      expect(written).not.toHaveProperty('token');
    });
  });

  describe('права доступа', () => {
    it('файл создан с правами 0o600', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      await cm.save({ token: 'sec', orgId: 'org-1' });

      const stat = await fs.stat(cm.getConfigPath());
      // mode: нижние 9 бит = rwx для owner/group/other.
      // 0o600 = owner rw, group/other nothing.
      // Маскируем до permission bits.
      const perms = stat.mode & 0o777;
      expect(perms).toBe(0o600);
    });
  });

  describe('load', () => {
    it('undefined если файла нет', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      expect(await cm.load()).toBeUndefined();
    });

    it('возвращает сохранённую конфигурацию', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      await cm.save({ token: 'sec', orgId: 'org-1' });
      expect(await cm.load()).toEqual({ token: 'sec', orgId: 'org-1' });
    });

    it('применяет deserialize-хук', async () => {
      const cm = new ConfigManager<YtConfig>({
        projectName,
        serialize: identitySerialize,
        deserialize: (data) => ({
          orgId: data['orgId'] as string,
          apiBase: (data['apiBase'] as string | undefined) ?? 'default-api',
        }),
      });
      await cm.save({ token: 'sec', orgId: 'org-1' });
      const loaded = await cm.load();
      expect(loaded).toEqual({ orgId: 'org-1', apiBase: 'default-api' });
    });

    it('возвращает undefined при битом JSON (не бросает)', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      // Создадим директорию и битый файл вручную
      await fs.mkdir(path.dirname(cm.getConfigPath()), { recursive: true });
      await fs.writeFile(cm.getConfigPath(), '{ broken json', 'utf-8');
      expect(await cm.load()).toBeUndefined();
    });
  });

  describe('exists', () => {
    it('false если файла нет', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      expect(await cm.exists()).toBe(false);
    });

    it('true после save', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      await cm.save({ token: 's', orgId: 'o' });
      expect(await cm.exists()).toBe(true);
    });
  });

  describe('delete', () => {
    it('удаляет существующий файл', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      await cm.save({ token: 's', orgId: 'o' });
      expect(await cm.exists()).toBe(true);
      await cm.delete();
      expect(await cm.exists()).toBe(false);
    });

    it('noop при отсутствии файла', async () => {
      const cm = new ConfigManager<YtConfig>({ projectName, serialize: identitySerialize });
      await expect(cm.delete()).resolves.toBeUndefined();
    });
  });
});
