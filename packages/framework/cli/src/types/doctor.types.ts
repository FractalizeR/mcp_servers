/**
 * Типы для команды самодиагностики `doctor`.
 *
 * Команда `doctor` запускает набор проверок (client-level + доменные) и
 * возвращает агрегированный {@link DoctorReport}. Доменные проверки
 * передаются вызывающим кодом через `extraChecks` — framework к доменной
 * модели агностичен.
 *
 * @packageDocumentation
 */

/**
 * Статус результата одной проверки.
 *
 * - `ok`   — проверка пройдена.
 * - `warn` — есть подозрение/неполные данные, но не блокер
 *            (например, путь выглядит относительным, файл конфига отсутствует).
 * - `fail` — проблема, из-за которой сервер точно не заработает.
 * - `skip` — проверка пропущена по объективным причинам (например, сервер не
 *            подключен к этому клиенту, нет данных для проверки).
 *            `skip` не учитывается в `summary.fail/warn/ok`.
 */
export type DoctorCheckStatus = 'ok' | 'warn' | 'fail' | 'skip';

/**
 * Результат выполнения одной проверки.
 */
export interface DoctorCheckResult {
  /** Итоговый статус. */
  status: DoctorCheckStatus;

  /** Человекочитаемое сообщение о результате. */
  message: string;

  /** Многострочные детали (например, путь к файлу, версия). Опционально. */
  details?: string[];

  /** Рекомендация по исправлению. Для `warn`/`fail`. Опционально. */
  hint?: string;
}

/**
 * Описание одной проверки.
 *
 * `run` — асинхронная функция, выполняющая проверку. Не должна выбрасывать
 * исключений (любое исключение перехватывается `doctorCommand` и трактуется
 * как `fail`).
 */
export interface DoctorCheck {
  /** Короткое имя проверки для вывода (например, `bundle-accessible`). */
  name: string;

  /** Развёрнутое описание того, что проверяется. */
  description: string;

  /**
   * Опциональная группа для визуальной группировки в выводе
   * (например, имя клиента `Claude Code` или домен `Yandex Tracker`).
   */
  group?: string;

  /** Функция выполнения проверки. */
  run: () => Promise<DoctorCheckResult>;
}

/**
 * Агрегированный отчёт о всех проверках.
 */
export interface DoctorReport {
  /**
   * Результаты проверок в детерминированном порядке (соответствует порядку,
   * в котором проверки были собраны: client-level → extraChecks).
   */
  checks: Array<{ check: DoctorCheck; result: DoctorCheckResult }>;

  /**
   * Сводка по статусам (без учёта `skip`).
   */
  summary: {
    ok: number;
    warn: number;
    fail: number;
    skip: number;
  };
}

// Forward declaration: точный тип импортируется через `types.ts`, чтобы избежать
// циклических зависимостей между doctor.types.ts и types.ts.
import type { IConnectorRegistry } from '../types.js';

/**
 * Опции для команды `doctor`.
 */
export interface DoctorCommandOptions {
  /** Реестр коннекторов MCP клиентов. */
  registry: IConnectorRegistry;

  /**
   * Дополнительные доменные проверки (например, валидация бандла сервера,
   * проверка локальной конфигурации). Выполняются параллельно с client-level.
   */
  extraChecks?: DoctorCheck[];
}
