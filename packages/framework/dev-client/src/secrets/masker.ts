/**
 * Контур секретов: маскирование значений env во всём выводе dev-интерфейса.
 *
 * Гарантия (см. `.agentic-planning/plan_mcp_dev_interface/README.md`, раздел
 * «Что именно гарантирует контур секретов»): токен не попадает в контекст
 * агента по неосторожности через вывод `mcp-dev`. Это не защита от намеренного
 * чтения — у агента и так есть Bash.
 */

import { isSensitiveEnvValue } from './sensitivity.js';

/** Функция маскирования: заменяет вхождения известных секретов в тексте. */
export type Masker = (text: string) => string;

/** Плейсхолдер, которым заменяется найденное значение секрета. */
const MASK_PLACEHOLDER = '***MASKED***';

/**
 * Порог «слишком короткого значения» (в символах).
 *
 * Действует уже **после** отбора чувствительных ключей и страхует от
 * вырожденных значений у переменной с чувствительным именем
 * (`AUTH_ENABLED=true`, `USE_KEY=1`): маскировать подстроку `true` во всём
 * выводе — значит сделать вывод нечитаемым ради значения, которое секретом
 * не является. Настоящие токены заведомо длиннее (обычно ≥20 символов).
 */
const MIN_MASKABLE_VALUE_LENGTH = 6;

/** Источники значений для маскера — различаются происхождением, а не правилом отбора. */
export interface MaskerSources {
  /**
   * `env` из записи MCP-клиента. Отбирается той же шкалой
   * {@link isSensitiveEnvValue}, что и родительское окружение; отличие только в
   * ответе для **неопознанного** ключа — для записи клиента он консервативный
   * («маскировать»), и это объявлено явно в `sensitivity.ts`.
   *
   * Заведомо несекретные ключи записи (`YANDEX_ORG_ID`, `LOG_LEVEL`,
   * `*_API_BASE`, `*_TIMEOUT`) под маску не попадают: семизначный orgId
   * случайно совпадает с числами в тексте тикетов, и агент читал бы искажённый
   * ответ, неотличимый от бага сервера.
   */
  readonly clientEnv: Record<string, string>;
  /**
   * Родительское окружение процесса (`process.env`). Та же шкала, но
   * неопознанный ключ секретом не считается — иначе `HOME`/`USER`/`PWD`
   * затирают собственную диагностику (`missing`/`stale` теряют путь).
   */
  readonly parentEnv?: Record<string, string | undefined>;
}

/** Значения, подлежащие маскированию, — отобранные единой шкалой чувствительности. */
function collectSensitiveValues(sources: MaskerSources): string[] {
  const values: string[] = [];
  for (const [key, value] of Object.entries(sources.clientEnv)) {
    if (typeof value === 'string' && isSensitiveEnvValue(key, value, 'clientEnv')) {
      values.push(value);
    }
  }
  for (const [key, value] of Object.entries(sources.parentEnv ?? {})) {
    if (typeof value === 'string' && isSensitiveEnvValue(key, value, 'parentEnv')) {
      values.push(value);
    }
  }
  return values;
}

/**
 * Построить маскер из значений чувствительных переменных окружения.
 *
 * Маскирует не только сырые значения, но и их JSON-экранированную форму
 * (через `JSON.stringify(value).slice(1, -1)`) — иначе секрет со спецсимволами
 * (`\`, `"`, перевод строки), встроенный в JSON-строку, останется читаемым:
 * `JSON.stringify` меняет байтовое представление значения, и сырой поиск
 * подстроки его не найдёт.
 *
 * Сортировка вариантов по убыванию длины — самый длинный вариант маскируется
 * первым, чтобы более короткое значение, являющееся префиксом/подстрокой
 * более длинного, не оставило хвост длинного значения замаскированным лишь
 * частично.
 */
export function createMasker(sources: MaskerSources): Masker {
  const variants = new Set<string>();
  for (const value of collectSensitiveValues(sources)) {
    if (value.length < MIN_MASKABLE_VALUE_LENGTH) continue;
    variants.add(value);
    variants.add(JSON.stringify(value).slice(1, -1));
  }
  const sorted = [...variants].filter((v) => v.length > 0).sort((a, b) => b.length - a.length);

  if (sorted.length === 0) {
    return (text: string): string => text;
  }

  return (text: string): string => {
    let out = text;
    for (const variant of sorted) {
      out = out.split(variant).join(MASK_PLACEHOLDER);
    }
    return out;
  };
}

/**
 * Рекурсивно замаскировать все строковые листья произвольного JSON-совместимого
 * значения (объекты/массивы результатов `tools/call`).
 *
 * Критично применять маскер **до** `JSON.stringify` всей структуры, а не после:
 * если сериализовать сперва, а потом искать секрет строковым поиском в готовом
 * JSON-тексте, экранирование (например, обратный слэш внутри значения) изменит
 * байты и подстрока-секрет перестанет совпадать с текстом. Маскируя листья до
 * сборки структуры, экранирование применяется уже к замаскированному плейсхолдеру.
 */
export function maskJsonValue(value: unknown, masker: Masker): unknown {
  if (typeof value === 'string') return masker(value);
  if (Array.isArray(value)) return value.map((item) => maskJsonValue(item, masker));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = maskJsonValue(item, masker);
    }
    return out;
  }
  return value;
}
