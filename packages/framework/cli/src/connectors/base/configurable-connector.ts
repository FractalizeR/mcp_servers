/**
 * Конфигурируемый file-based коннектор
 *
 * Универсальная реализация для всех клиентов, хранящих MCP-конфигурацию в JSON/TOML
 * файлах (Claude Desktop, Gemini, Qwen, Codex и т.п.). Параметризуется через
 * {@link ConnectorClientConfig}, передаваемый в конструктор — без наследования.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BaseConnector } from './base-connector.js';
import { CommandExecutor } from '../../utils/command-executor.js';
import { FileManager } from '../../utils/file-manager.js';
import { resolveExecutablePath } from '../../utils/launch-spec-helpers.js';
import type { ConnectionStatus, MCPClientInfo } from '../../types/client.types.js';
import type { GetLaunchSpecResult, ServerLaunchSpec } from '../../types/launch.types.js';

/**
 * Таймаут для проверки `checkCommand` в {@link ConfigurableConnector.isInstalled}.
 *
 * 2 секунды — компромисс между быстрой проверкой и допуском медленных
 * стартующих CLI (gemini, codex могут грузиться 300-500ms на старте).
 */
const CHECK_COMMAND_TIMEOUT_MS = 2000;

/**
 * Запись о сервере в файле конфигурации клиента.
 *
 * Структура соответствует фактическим JSON/TOML-форматам Claude Desktop,
 * Gemini, Qwen, Codex. Дополнительные опциональные поля (`cwd`, `disabled`)
 * пишутся только если заданы в {@link ServerLaunchSpec}.
 *
 * @internal Используется только внутри ConfigurableConnector.
 */
interface ClientServerConfigEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
  disabled?: boolean;
}

/**
 * Внутренняя «расширенная» форма клиентского конфига: top-level объект с
 * произвольным ключом серверов (например, `mcpServers` или `mcp_servers`).
 * Используется для динамической работы с ключом, известным только в runtime.
 */
type RawClientConfig = Record<string, Record<string, ClientServerConfigEntry>>;

/**
 * Формат конфигурационного файла клиента
 */
export type ConfigFormat = 'json' | 'toml';

/**
 * Конфигурация клиента для {@link ConfigurableConnector}.
 *
 * `configPath` может быть строкой или функцией: функция позволяет ленивое
 * platform-aware вычисление пути (например, для Claude Desktop, где путь
 * различается на darwin/linux/win32).
 */
export interface ConnectorClientConfig {
  /** Уникальное имя клиента (например, 'gemini', 'qwen', 'codex') */
  name: string;
  /** Отображаемое имя (например, 'Gemini CLI') */
  displayName: string;
  /** Описание клиента */
  description: string;
  /** Путь к конфигурационному файлу или функция, возвращающая такой путь */
  configPath: string | (() => string);
  /** Поддерживаемые платформы */
  platforms: Array<'darwin' | 'linux' | 'win32'>;
  /** Команда проверки установки (опционально) */
  checkCommand?: string;
  /** Ключ для серверов в конфиге (по умолчанию 'mcpServers') */
  serverKey?: string;
  /** Формат конфига (по умолчанию 'json') */
  configFormat?: ConfigFormat;
}

/**
 * Type guard для проверки Error
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Конфигурируемый file-based коннектор.
 *
 * Поддерживает JSON и TOML форматы, произвольные ключи для серверов
 * (`mcpServers`, `mcp_servers`). Запись/чтение/удаление выполняются напрямую
 * над `{ command, args, env }` из {@link ServerLaunchSpec}; framework не
 * знает доменных полей.
 *
 * @example
 * ```typescript
 * const connector = new ConfigurableConnector(
 *   'mcp-server-yandex-tracker',
 *   {
 *     name: 'gemini',
 *     displayName: 'Gemini CLI',
 *     description: 'Gemini CLI для MCP',
 *     configPath: path.join(os.homedir(), '.gemini/settings.json'),
 *     platforms: ['darwin', 'linux', 'win32'],
 *   }
 * );
 * await connector.connect({ command: 'node', args: ['/abs/path.cjs'], env: {} });
 * ```
 */
export class ConfigurableConnector extends BaseConnector {
  private readonly _serverName: string;
  private readonly _clientConfig: ConnectorClientConfig;

  /**
   * @param serverName - Имя MCP сервера для записи в конфигурацию клиента
   * @param clientConfig - Конфигурация клиента (имя, путь, формат и т.п.)
   */
  constructor(serverName: string, clientConfig: ConnectorClientConfig) {
    super();
    this._serverName = serverName;
    this._clientConfig = clientConfig;
  }

  getClientInfo(): MCPClientInfo {
    const info: MCPClientInfo = {
      name: this._clientConfig.name,
      displayName: this._clientConfig.displayName,
      description: this._clientConfig.description,
      configPath: this.resolveConfigPath(),
      platforms: this._clientConfig.platforms,
    };
    if (this._clientConfig.checkCommand) {
      info.checkCommand = this._clientConfig.checkCommand;
    }
    return info;
  }

  /**
   * Проверить, установлен ли клиент.
   *
   * Если в {@link ConnectorClientConfig.checkCommand} задана команда — пробуем
   * выполнить её с таймаутом {@link CHECK_COMMAND_TIMEOUT_MS}. Успех (exit 0) →
   * клиент установлен. Любая ошибка/таймаут → fallback на dir-check.
   *
   * Если `checkCommand` не задана — единственная проверка: наличие директории
   * конфига.
   *
   * Поведение fallback мотивировано тем, что директория конфига может остаться
   * после удаления клиента (false positive); checkCommand даёт более надёжный
   * сигнал, но при его недоступности dir-check всё ещё лучше чем ничего.
   */
  async isInstalled(): Promise<boolean> {
    const checkCommand = this._clientConfig.checkCommand;
    if (checkCommand && checkCommand.trim().length > 0) {
      const installed = this.tryCheckCommand(checkCommand);
      if (installed) {
        return true;
      }
      // Fallback на dir-check (например, бинарь временно недоступен в PATH,
      // но клиент явно установлен — есть конфиг).
    }
    const configDir = path.dirname(this.resolveConfigPath());
    return FileManager.exists(configDir);
  }

  /**
   * Запустить `checkCommand` с таймаутом. Команда парсится по whitespace:
   * первый токен — бинарь, остальное — аргументы. Выполняется через
   * {@link CommandExecutor.execFile} (без shell-интерпретации).
   *
   * @returns `true` если команда успешно выполнилась (exit 0); `false` иначе.
   */
  private tryCheckCommand(checkCommand: string): boolean {
    const tokens = checkCommand.split(/\s+/).filter((t) => t.length > 0);
    const bin = tokens[0];
    if (!bin) return false;
    const args = tokens.slice(1);
    try {
      CommandExecutor.execFile(bin, args, { timeout: CHECK_COMMAND_TIMEOUT_MS });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получить статус подключения. Дополнительно к наличию записи в конфиге проверяет
   * существование `command` на диске (для абсолютных путей и `node` со скриптом
   * в args).
   */
  async getStatus(): Promise<ConnectionStatus> {
    try {
      const configPath = this.resolveConfigPath();

      if (!(await FileManager.exists(configPath))) {
        return { connected: false, error: 'Конфигурационный файл не найден' };
      }

      const config = await this.readConfig();
      const servers = config[this.getServerKey()];
      const serverEntry = servers?.[this._serverName];

      if (!serverEntry) {
        return { connected: false };
      }

      const commandOk = await this.commandExistsOnDisk(serverEntry);
      if (!commandOk) {
        return {
          connected: false,
          error: `Команда сервера не найдена на диске: ${this.describeCommand(serverEntry)}`,
          details: {
            configPath,
            metadata: { serverConfig: serverEntry },
          },
        };
      }

      return {
        connected: true,
        details: {
          configPath,
          metadata: { serverConfig: serverEntry },
        },
      };
    } catch (error) {
      const errorMessage = isError(error) ? error.message : String(error);
      return {
        connected: false,
        error: `Ошибка чтения конфига: ${errorMessage}`,
      };
    }
  }

  /**
   * Подключить MCP сервер: записать spec в файл конфигурации клиента.
   */
  async connect(spec: ServerLaunchSpec): Promise<void> {
    const configPath = this.resolveConfigPath();
    const configDir = path.dirname(configPath);

    await FileManager.ensureDir(configDir);

    let config: RawClientConfig;
    if (await FileManager.exists(configPath)) {
      config = await this.readConfig();
    } else {
      config = this.createDefaultConfig();
    }

    const serverKey = this.getServerKey();
    const servers = (config[serverKey] ??= {});
    const entry: ClientServerConfigEntry = {
      command: spec.command,
      args: [...spec.args],
      env: spec.env,
    };
    if (spec.cwd !== undefined) {
      entry.cwd = spec.cwd;
    }
    if (spec.disabled !== undefined) {
      entry.disabled = spec.disabled;
    }
    servers[this._serverName] = entry;

    await this.writeConfig(config);
  }

  /**
   * Отключить MCP сервер: удалить запись из конфигурации.
   */
  async disconnect(): Promise<void> {
    const configPath = this.resolveConfigPath();

    if (!(await FileManager.exists(configPath))) {
      return;
    }

    const config = await this.readConfig();
    const serverKey = this.getServerKey();
    const servers = config[serverKey];

    if (servers?.[this._serverName]) {
      delete servers[this._serverName];
      await this.writeConfig(config);
    }
  }

  /**
   * Прочитать spec, записанную в конфиге клиента.
   *
   * Файл-based клиенты пишут ровно то, что было передано в `connect()` —
   * поэтому здесь различимы только `found`/`notConnected`/`unparsable`
   * (`notStdio`/`commandFailed` для этого класса коннекторов невозможны:
   * записи всегда описывают команду+аргументы, а чтение — не внешняя команда).
   *
   * @returns {@link GetLaunchSpecResult}.
   */
  async getLaunchSpec(): Promise<GetLaunchSpecResult> {
    try {
      const configPath = this.resolveConfigPath();
      if (!(await FileManager.exists(configPath))) {
        return { outcome: 'notConnected' };
      }

      const config = await this.readConfig();
      const entry = config[this.getServerKey()]?.[this._serverName];
      if (!entry) {
        return { outcome: 'notConnected' };
      }

      const spec: ServerLaunchSpec = {
        command: entry.command,
        args: entry.args,
        env: entry.env,
      };
      if (entry.cwd !== undefined) {
        spec.cwd = entry.cwd;
      }
      if (entry.disabled !== undefined) {
        spec.disabled = entry.disabled;
      }
      return { outcome: 'found', spec };
    } catch (error) {
      return { outcome: 'unparsable', reason: isError(error) ? error.message : String(error) };
    }
  }

  // ----- internal -----

  private resolveConfigPath(): string {
    const value = this._clientConfig.configPath;
    return typeof value === 'function' ? value() : value;
  }

  private getServerKey(): string {
    return this._clientConfig.serverKey ?? 'mcpServers';
  }

  private getConfigFormat(): ConfigFormat {
    return this._clientConfig.configFormat ?? 'json';
  }

  private async readConfig(): Promise<RawClientConfig> {
    const configPath = this.resolveConfigPath();
    const format = this.getConfigFormat();
    return format === 'json'
      ? FileManager.readJSON<RawClientConfig>(configPath)
      : FileManager.readTOML<RawClientConfig>(configPath);
  }

  private async writeConfig(config: RawClientConfig): Promise<void> {
    const configPath = this.resolveConfigPath();
    const format = this.getConfigFormat();
    if (format === 'json') {
      await FileManager.writeJSON(configPath, config);
    } else {
      await FileManager.writeTOML(configPath, config);
    }
  }

  private createDefaultConfig(): RawClientConfig {
    return { [this.getServerKey()]: {} } as RawClientConfig;
  }

  /**
   * Проверка существования команды на диске. Логика выровнена с
   * {@link BaseConnector.validateLaunchSpec}:
   *  - абсолютный путь команды → `fs.access`;
   *  - `node` + первый абсолютный путь в args → `fs.access`;
   *  - всё остальное (`npx`, `pipx`, относительная команда из PATH) → считаем OK,
   *    не пытаемся резолвить PATH.
   */
  private async commandExistsOnDisk(entry: ClientServerConfigEntry): Promise<boolean> {
    const filePath = resolveExecutablePath({
      command: entry.command,
      args: entry.args,
      env: entry.env,
    });
    if (filePath === null) {
      // npx/pipx/relative-from-PATH или `node` без абсолютного пути в args —
      // на диске проверить нечего, считаем OK.
      return true;
    }
    return this.pathExists(filePath);
  }

  private describeCommand(entry: ClientServerConfigEntry): string {
    const filePath = resolveExecutablePath({
      command: entry.command,
      args: entry.args,
      env: entry.env,
    });
    return filePath ?? entry.command;
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
}
