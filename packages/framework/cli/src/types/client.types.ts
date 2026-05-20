/**
 * Client-related types for MCP CLI Framework (framework-agnostic)
 * @packageDocumentation
 */

/**
 * Информация о MCP клиенте (Claude Desktop, Claude Code и т.д.)
 */
export interface MCPClientInfo {
  /** Уникальное имя клиента (используется как ключ) */
  name: string;

  /** Отображаемое имя для пользователя */
  displayName: string;

  /** Описание клиента */
  description: string;

  /** Команда для проверки установки (например, 'claude --version') */
  checkCommand?: string;

  /** Путь к конфигурационному файлу */
  configPath: string;

  /** Поддерживаемые платформы */
  platforms: Array<'darwin' | 'linux' | 'win32'>;
}

/**
 * Статус подключения MCP сервера к клиенту
 */
export interface ConnectionStatus {
  /** Подключен ли сервер */
  connected: boolean;

  /** Детали подключения */
  details?: {
    /** Путь к конфигурационному файлу клиента */
    configPath: string;

    /** Время последнего изменения конфига */
    lastModified?: Date;

    /** Дополнительная информация */
    metadata?: Record<string, unknown>;
  };

  /** Ошибка (если есть) */
  error?: string;
}

/**
 * Конфигурация MCP сервера для записи в файл клиента (JSON/TOML)
 *
 * @internal Используется только реализациями коннекторов. Публичный API
 * принимает {@link ServerLaunchSpec}.
 */
export interface MCPClientServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/**
 * Базовая структура конфигурационного файла MCP клиента
 * Generic тип для разных форматов (mcpServers, mcp_servers и т.д.)
 *
 * @internal Используется только реализациями коннекторов.
 */
export type MCPClientConfig<TKey extends string = 'mcpServers'> = {
  [K in TKey]?: Record<string, MCPClientServerConfig>;
};

/**
 * Типы промптов для сбора конфигурации
 */
export type PromptType = 'input' | 'password' | 'select' | 'confirm' | 'number';

/**
 * Определение промпта для сбора конфигурации
 *
 * @template TDomainConfig - Тип доменной конфигурации MCP сервера (произвольный объект)
 * @template K - Ключ поля в конфигурации
 */
export interface ConfigPromptDefinition<
  TDomainConfig extends object,
  K extends keyof TDomainConfig = keyof TDomainConfig,
> {
  /** Имя поля в конфигурации */
  name: K;

  /** Тип промпта */
  type: PromptType;

  /** Сообщение для пользователя */
  message: string;

  /** Значение по умолчанию (может быть функцией от сохраненной конфигурации) */
  default?:
    | TDomainConfig[K]
    | ((savedConfig?: Partial<TDomainConfig>) => TDomainConfig[K] | undefined);

  /** Функция валидации */
  validate?: (value: TDomainConfig[K]) => string | true;

  /** Варианты выбора (для type: 'select') */
  choices?: Array<{ name: string; value: TDomainConfig[K] }>;

  /** Условное отображение промпта */
  when?: (answers: Partial<TDomainConfig>) => boolean;

  /** Маска для ввода (для type: 'password') */
  mask?: string;
}

/**
 * Опции для ConfigManager
 *
 * @template TDomainConfig - Тип доменной конфигурации MCP сервера (произвольный объект)
 */
export interface ConfigManagerOptions<TDomainConfig extends object> {
  /** Название проекта (для ~/.{projectName}/config.json) */
  projectName: string;

  /**
   * Кастомная сериализация перед записью в файл.
   *
   * Обязательное поле — гарантия защиты от случайного сохранения секретов:
   * адаптер сервера обязан явно решить, какие поля попадают в config.json
   * (например, исключить token и сохранить только orgId/apiBase).
   *
   * Если в твоём адаптере хочется писать «весь объект как есть» — передай
   * `serialize: (cfg) => ({ ...cfg })`. Это явное согласие на сохранение
   * всех полей.
   */
  serialize: (config: TDomainConfig) => Record<string, unknown>;

  /**
   * Опционально: кастомная десериализация после чтения из файла.
   */
  deserialize?: (data: Record<string, unknown>) => Partial<TDomainConfig>;
}
