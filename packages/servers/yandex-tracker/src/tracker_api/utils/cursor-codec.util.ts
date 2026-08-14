/**
 * CursorCodec — кодек непрозрачного (opaque) курсора пагинации Яндекс.Трекера.
 *
 * Ответственность (SRP):
 * - ПРОИЗВОДИТ курсор из относительного next-пути (`Link rel="next"`) — base64url
 *   полезной нагрузки с версией, тегом семейства эндпоинта и путём;
 * - ПРИНИМАЕТ курсор на вход → декодирует → валидирует версию/тег/guard пути →
 *   возвращает путь (и опциональную доп. нагрузку, напр. хеш тела для `_search`).
 *
 * Курсор для агента — чёрный ящик: он лишь передаёт `pagination.nextCursor`
 * обратно тому же инструменту. Сервер повторяет закодированный путь как запрос.
 *
 * Гарантии (R3/R12/R13):
 * - `decode` НИКОГДА не возвращает `undefined` и не делает тихий fallback на
 *   первую страницу: при любой проблеме (битый base64/JSON, неизвестная версия,
 *   mismatch тега, путь не из `/v[23]/`) бросает {@link InvalidCursorError}.
 * - Тег семейства защищает от кросс-эндпоинт курсора (курсор `queues` в инструменте
 *   `comments` → explicit error, а не тихие чужие данные).
 *
 * Статический util без DI-регистрации; живёт в `#tracker_api/utils`.
 */

import { stripTrackerHost } from './strip-host.util.js';

/**
 * Ошибка невалидного входного курсора.
 *
 * Бросается `CursorCodec.decode`. Доходит до агента как explicit-ошибка
 * (валидационная), а не как тихий возврат первой страницы.
 */
export class InvalidCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCursorError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidCursorError);
    }
  }
}

/**
 * Версия формата курсора. Кодируется префиксом токена (`c1:`) для forward-compat:
 * неизвестный префикс → `InvalidCursorError`.
 */
export const CURSOR_VERSION_PREFIX = 'c1:';

/**
 * Тег семейства эндпоинта в курсоре (R13).
 *
 * Короткий код на каждый cursor-эндпоинт. Несовпадение ожидаемого и фактического
 * тега при `decode` → `InvalidCursorError` (защита от кросс-эндпоинт курсора).
 * Непагинируемые эндпоинты (components/attachments) курсор не выдают и тега не имеют.
 */
export const CURSOR_TAGS = {
  changelog: 'chlog',
  comments: 'cmnt',
  links: 'links',
  worklog: 'wlog',
  checklist: 'chk',
  queues: 'q',
  projects: 'proj',
  findIssues: 'find',
  // Пакет 7.2.A/7.2.B (.agentic-planning/plan_mcp_2026_modernization/
  // 7.2_api_coverage_parallel.md): новые пагинируемые эндпоинты.
  findEntities: 'fent',
  users: 'usr',
  worklogSearch: 'wlogs',
} as const;

/**
 * Допустимые значения тега семейства эндпоинта.
 */
export type CursorTag = (typeof CURSOR_TAGS)[keyof typeof CURSOR_TAGS];

/**
 * Результат декодирования курсора.
 */
export interface DecodedCursor {
  /** Относительный путь следующей страницы (прошёл guard `/^\/v[23]\//`). */
  readonly path: string;
  /**
   * Опциональная доп. нагрузка семейства эндпоинта.
   *
   * Для `find_issues` (`_search`) — хеш канонического тела запроса (R2): операция
   * сверяет его с хешем повторно переданных критериев. Для остальных — отсутствует.
   */
  readonly extra?: string | undefined;
}

/**
 * Внутренняя форма полезной нагрузки токена (после base64url+JSON).
 */
interface CursorPayload {
  /** Тег семейства эндпоинта. */
  readonly t: string;
  /** Относительный next-путь. */
  readonly p: string;
  /** Доп. нагрузка (хеш тела для `_search`); опционально. */
  readonly h?: string;
}

/**
 * Кодек opaque-курсора.
 */
export class CursorCodec {
  /**
   * Закодировать относительный next-путь в курсор.
   *
   * @param relativePath - относительный путь+query (как вернул {@link stripTrackerHost})
   * @param tag - тег семейства эндпоинта (для сверки при decode)
   * @param extra - опциональная доп. нагрузка (хеш тела `_search`)
   * @returns непрозрачная строка-курсор (`c1:` + base64url(JSON))
   */
  public static encode(relativePath: string, tag: CursorTag, extra?: string): string {
    const payload: CursorPayload = {
      t: tag,
      p: relativePath,
      ...(extra !== undefined ? { h: extra } : {}),
    };
    const json = JSON.stringify(payload);
    const b64 = Buffer.from(json, 'utf8').toString('base64url');
    return `${CURSOR_VERSION_PREFIX}${b64}`;
  }

  /**
   * Декодировать курсор и провалидировать версию/тег/путь.
   *
   * @param cursor - непрозрачная строка-курсор от агента
   * @param expectedTag - тег семейства эндпоинта, для которого курсор валиден
   * @returns путь (+ опц. доп. нагрузка)
   * @throws {InvalidCursorError} при битом/чужом/устаревшем курсоре (R3/R12/R13)
   */
  public static decode(cursor: string, expectedTag: CursorTag): DecodedCursor {
    if (!cursor.startsWith(CURSOR_VERSION_PREFIX)) {
      throw new InvalidCursorError(
        'Неподдерживаемый или повреждённый курсор (неизвестная версия формата). ' +
          'Используйте значение pagination.nextCursor из ответа того же инструмента.'
      );
    }

    const payload = CursorCodec.parsePayload(cursor.slice(CURSOR_VERSION_PREFIX.length));

    if (payload.t !== expectedTag) {
      throw new InvalidCursorError(
        'Курсор принадлежит другому инструменту и не может быть использован здесь. ' +
          'Курсор валиден только для того инструмента, который его выдал.'
      );
    }

    const path = stripTrackerHost(payload.p);
    if (path === undefined) {
      throw new InvalidCursorError(
        'Курсор содержит недопустимый путь (ожидался путь API Трекера /v2/ или /v3/).'
      );
    }

    return { path, ...(payload.h !== undefined ? { extra: payload.h } : {}) };
  }

  /**
   * Декодировать курсор issue-scoped эндпоинта и сверить принадлежность задаче.
   *
   * Защита от тихо неверных данных: `cursorRequiresSingleIssue` гарантирует один
   * issueId, но не то, что курсор выдан именно для НЕГО. Курсор задачи A с
   * `issueId=B` дал бы данные A под меткой B. Здесь путь обязан содержать
   * `/issues/{issueId}/`; иначе — {@link InvalidCursorError} (как кросс-эндпоинт R13).
   *
   * @param cursor - непрозрачная строка-курсор
   * @param expectedTag - тег семейства эндпоинта
   * @param issueId - идентификатор/ключ задачи текущего запроса
   * @throws {InvalidCursorError} при битом/чужом курсоре ИЛИ курсоре другой задачи
   */
  public static decodeForIssue(
    cursor: string,
    expectedTag: CursorTag,
    issueId: string
  ): DecodedCursor {
    const decoded = CursorCodec.decode(cursor, expectedTag);
    if (!decoded.path.includes(`/issues/${issueId}/`)) {
      throw new InvalidCursorError(
        'Курсор принадлежит другой задаче и не может быть использован здесь. ' +
          'Передавайте курсор тому же issueId, для которого он был выдан.'
      );
    }
    return decoded;
  }

  /**
   * Распарсить base64url-полезную нагрузку в валидную {@link CursorPayload}.
   *
   * @throws {InvalidCursorError} при битом base64/JSON или неверной форме payload
   */
  private static parsePayload(b64: string): CursorPayload {
    // Buffer.from(_, 'base64url') молча игнорирует посторонние символы, поэтому
    // строгий guard алфавита base64url (включая пустую строку) — иначе битый
    // курсор с «мусором» прошёл бы вместо явной ошибки (R3/R12).
    if (!/^[A-Za-z0-9_-]+$/.test(b64)) {
      throw new InvalidCursorError('Курсор повреждён (недопустимые символы в payload).');
    }

    let json: string;
    try {
      json = Buffer.from(b64, 'base64url').toString('utf8');
    } catch {
      throw new InvalidCursorError('Курсор повреждён (не удалось декодировать base64url).');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new InvalidCursorError('Курсор повреждён (не удалось разобрать содержимое).');
    }

    if (!CursorCodec.isPayload(parsed)) {
      throw new InvalidCursorError('Курсор повреждён (неожиданная структура данных).');
    }

    return parsed;
  }

  /**
   * Type guard формы полезной нагрузки.
   */
  private static isPayload(value: unknown): value is CursorPayload {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const record = value as Record<string, unknown>;
    const tagOk = typeof record['t'] === 'string' && record['t'].length > 0;
    const pathOk = typeof record['p'] === 'string' && record['p'].length > 0;
    const extraOk = record['h'] === undefined || typeof record['h'] === 'string';
    return tagOk && pathOk && extraOk;
  }
}
