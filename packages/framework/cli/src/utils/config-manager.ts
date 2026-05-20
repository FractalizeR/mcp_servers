/**
 * Generic менеджер конфигурации MCP сервера
 * @packageDocumentation
 */

import * as path from 'path';
import type { ConfigManagerOptions } from '../types/client.types.js';
import { FileManager } from './file-manager.js';

/**
 * Generic менеджер конфигурации MCP сервера.
 *
 * Хранит конфигурацию в `~/.{projectName}/config.json`. По умолчанию сохраняется
 * весь объект как есть; для фильтрации (например, исключения секретов) задайте
 * `options.serialize`.
 *
 * @example
 * ```typescript
 * interface YtConfig { token: string; orgId: string; apiBase?: string }
 *
 * const cm = new ConfigManager<YtConfig>({
 *   projectName: 'fractalizer_mcp_yandex_tracker',
 *   // serialize-хук исключает секреты:
 *   serialize: (cfg) => ({ orgId: cfg.orgId, apiBase: cfg.apiBase }),
 * });
 *
 * await cm.save({ token: 's3cr3t', orgId: 'org-1' });
 * const saved = await cm.load(); // { orgId: 'org-1' }
 * ```
 */
export class ConfigManager<TDomainConfig extends object> {
  private readonly configPath: string;

  constructor(private readonly options: ConfigManagerOptions<TDomainConfig>) {
    const homeDir = FileManager.getHomeDir();
    const configDir = `.${options.projectName}`;
    this.configPath = path.join(homeDir, configDir, 'config.json');
  }

  /**
   * Загрузить сохранённую конфигурацию.
   *
   * @returns Partial конфигурацию или `undefined`, если файл не существует.
   */
  async load(): Promise<Partial<TDomainConfig> | undefined> {
    try {
      if (!(await FileManager.exists(this.configPath))) {
        return undefined;
      }

      const data = await FileManager.readJSON<Record<string, unknown>>(this.configPath);

      if (this.options.deserialize) {
        return this.options.deserialize(data);
      }

      return data as Partial<TDomainConfig>;
    } catch {
      return undefined;
    }
  }

  /**
   * Сохранить конфигурацию.
   *
   * Если `options.serialize` задан — используется его результат. Иначе записывается
   * весь объект как есть.
   *
   * @param config - Полная конфигурация MCP сервера.
   */
  async save(config: TDomainConfig): Promise<void> {
    const configDir = path.dirname(this.configPath);
    await FileManager.ensureDir(configDir);

    const dataToSave = this.options.serialize
      ? this.options.serialize(config)
      : (config as unknown as Record<string, unknown>);

    await FileManager.writeJSON(this.configPath, dataToSave);

    // Безопасные права доступа (только владелец)
    await FileManager.setPermissions(this.configPath, 0o600);
  }

  /**
   * Удалить сохранённую конфигурацию.
   */
  async delete(): Promise<void> {
    if (await FileManager.exists(this.configPath)) {
      const fs = await import('fs/promises');
      await fs.unlink(this.configPath);
    }
  }

  /**
   * Проверить существование конфигурации.
   */
  async exists(): Promise<boolean> {
    return FileManager.exists(this.configPath);
  }

  /**
   * Получить путь к файлу конфигурации.
   */
  getConfigPath(): string {
    return this.configPath;
  }
}
