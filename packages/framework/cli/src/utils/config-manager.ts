/**
 * Generic менеджер конфигурации MCP сервера
 * @packageDocumentation
 */

import * as path from 'path';
import type { BaseMCPServerConfig, ConfigManagerOptions } from '../types/base.types.js';
import { FileManager } from './file-manager.js';

/**
 * Generic менеджер конфигурации MCP сервера
 *
 * Сохраняет только безопасные поля (без секретов) в ~/.{projectName}/config.json
 *
 * @example
 * ```typescript
 * // Определяем свою конфигурацию
 * interface YandexTrackerMCPConfig extends BaseMCPServerConfig {
 *   token: string;        // СЕКРЕТ - не сохраняется
 *   orgId: string;        // Безопасно - сохраняется
 *   apiBase?: string;     // Безопасно - сохраняется
 * }
 *
 * // Создаем ConfigManager
 * const configManager = new ConfigManager<YandexTrackerMCPConfig>({
 *   projectName: 'fractalizer_mcp_yandex_tracker',
 *
 *   // Список безопасных полей (БЕЗ token!)
 *   safeFields: ['orgId', 'apiBase', 'logLevel', 'projectPath'],
 * });
 *
 * // Сохранение конфигурации
 * await configManager.save({
 *   token: 'secret-token',
 *   orgId: 'my-org',
 *   projectPath: '/path/to/project',
 *   logLevel: 'info',
 * });
 *
 * // Загрузка конфигурации
 * const saved = await configManager.load();
 * // saved = { orgId: 'my-org', logLevel: 'info', projectPath: '/path/to/project' }
 * // token НЕ сохранен и будет запрошен заново
 * ```
 */
export class ConfigManager<TConfig extends BaseMCPServerConfig> {
  private readonly configPath: string;

  constructor(private readonly options: ConfigManagerOptions<TConfig>) {
    const homeDir = FileManager.getHomeDir();
    const configDir = `.${options.projectName}`;
    this.configPath = path.join(homeDir, configDir, 'config.json');
  }

  /**
   * Загрузить сохраненную конфигурацию
   *
   * @returns Partial конфигурацию (только безопасные поля) или undefined если файл не существует
   */
  async load(): Promise<Partial<TConfig> | undefined> {
    try {
      if (!(await FileManager.exists(this.configPath))) {
        return undefined;
      }

      const data = await FileManager.readJSON<Record<string, unknown>>(this.configPath);

      // Кастомная десериализация если задана
      if (this.options.deserialize) {
        return this.options.deserialize(data);
      }

      return data as Partial<TConfig>;
    } catch {
      return undefined;
    }
  }

  /**
   * Сохранить конфигурацию
   * Автоматически фильтрует только безопасные поля
   *
   * @param config - Полная конфигурация MCP сервера
   */
  async save(config: TConfig): Promise<void> {
    const configDir = path.dirname(this.configPath);
    await FileManager.ensureDir(configDir);

    // Сохраняем только безопасные поля
    const safeConfig: Partial<TConfig> = {};
    for (const field of this.options.safeFields) {
      if (field in config) {
        safeConfig[field] = config[field];
      }
    }

    // Кастомная сериализация если задана
    const dataToSave = this.options.serialize
      ? this.options.serialize(config)
      : (safeConfig as Record<string, unknown>);

    await FileManager.writeJSON(this.configPath, dataToSave);

    // Безопасные права доступа (только владелец)
    await FileManager.setPermissions(this.configPath, 0o600);
  }

  /**
   * Удалить сохраненную конфигурацию
   */
  async delete(): Promise<void> {
    if (await FileManager.exists(this.configPath)) {
      const fs = await import('fs/promises');
      await fs.unlink(this.configPath);
    }
  }

  /**
   * Проверить существование конфигурации
   *
   * @returns true если файл конфигурации существует
   */
  async exists(): Promise<boolean> {
    return FileManager.exists(this.configPath);
  }

  /**
   * Получить путь к файлу конфигурации
   *
   * @returns Абсолютный путь к config.json
   */
  getConfigPath(): string {
    return this.configPath;
  }
}
