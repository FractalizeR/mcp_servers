/**
 * OpaqueCursorCodec — универсальный кодек непрозрачного (opaque) курсора
 * пагинации для MCP Resources (пакет 5.1.A плана модернизации MCP 2026-07-28).
 *
 * ПОЧЕМУ НОВЫЙ КЛАСС, А НЕ ИМПОРТ СУЩЕСТВУЮЩЕГО.
 *
 * У Яндекс.Трекера уже есть opaque-курсор для list-эндпоинтов —
 * `CursorCodec` (`packages/servers/yandex-tracker/src/tracker_api/utils/cursor-codec.util.ts`).
 * Механизм этого файла — ТОТ ЖЕ САМЫЙ по конструкции: версионный префикс
 * токена, base64url(JSON), тег семейства для защиты от кросс-эндпоинт
 * переиспользования курсора, явный `throw` при любой проблеме декодирования
 * (никогда не тихий fallback на первую страницу).
 *
 * Прямой импорт класса Трекера в framework невозможен и не является целью:
 * (1) граф зависимостей monorepo прямо запрещает импорт из yandex-tracker в
 * framework-пакеты (CLAUDE.md, §1 "Граф зависимостей"); (2) полезная
 * нагрузка курсора Трекера — относительный HTTP-путь `/v2|v3/...` конкретно
 * Трекера (`CursorCodec.decode` валидирует его через `stripTrackerHost`) —
 * она устроена под конкретный домен, а не под произвольный ResourceProvider.
 * Здесь тот же дизайн обобщён на произвольную JSON-сериализуемую полезную
 * нагрузку курсора вместо пути Трекера — так провайдеры Wiki/Трекера
 * (следующая волна, пакет 5.1.C) переиспользуют один и тот же механизм через
 * `ResourceRegistry`, не имея доступа к внутреннему API Трекера.
 */

/**
 * Ошибка невалидного входного курсора resources/list.
 *
 * Бросается {@link OpaqueCursorCodec.decode}. `ResourceRegistry` перехватывает
 * её и перевыбрасывает как протокольную `-32602` (см. resource-registry.ts) —
 * сам этот класс не привязан к JSON-RPC кодам, чтобы оставаться переиспользуемым
 * вне контекста одного конкретного протокольного ответа.
 */
export class InvalidOpaqueCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOpaqueCursorError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidOpaqueCursorError);
    }
  }
}

/**
 * Версия формата курсора. Кодируется префиксом токена (`r1:`) для
 * forward-compat: неизвестный префикс → {@link InvalidOpaqueCursorError}.
 */
export const OPAQUE_CURSOR_VERSION_PREFIX = 'r1:';

/**
 * Внутренний конверт курсора (после base64url+JSON): тег семейства + опаковая
 * полезная нагрузка вызывающей стороны.
 */
interface CursorEnvelope<TPayload> {
  /** Тег семейства — тот же курсор нельзя скормить другому провайдеру/семейству. */
  readonly t: string;
  /** Полезная нагрузка вызывающей стороны (для ResourceRegistry — AggregateCursorState). */
  readonly d: TPayload;
}

/**
 * Кодек opaque-курсора: версия + тег семейства + JSON-полезная нагрузка.
 *
 * Дженерик по типу полезной нагрузки — вызывающая сторона (ResourceRegistry)
 * отвечает за форму `TPayload` и её JSON-сериализуемость.
 */
export class OpaqueCursorCodec {
  /**
   * Закодировать полезную нагрузку в непрозрачный курсор.
   *
   * @param payload - произвольная JSON-сериализуемая полезная нагрузка
   * @param tag - тег семейства (сверяется при decode)
   * @returns непрозрачная строка-курсор (`r1:` + base64url(JSON))
   */
  public static encode<TPayload>(payload: TPayload, tag: string): string {
    const envelope: CursorEnvelope<TPayload> = { t: tag, d: payload };
    const json = JSON.stringify(envelope);
    const b64 = Buffer.from(json, 'utf8').toString('base64url');
    return `${OPAQUE_CURSOR_VERSION_PREFIX}${b64}`;
  }

  /**
   * Декодировать курсор и провалидировать версию/тег.
   *
   * @param cursor - непрозрачная строка-курсор от агента
   * @param expectedTag - тег семейства, для которого курсор валиден
   * @returns полезная нагрузка, ранее переданная в {@link encode}
   * @throws {InvalidOpaqueCursorError} при битом/чужом/устаревшем курсоре
   */
  public static decode<TPayload>(cursor: string, expectedTag: string): TPayload {
    if (!cursor.startsWith(OPAQUE_CURSOR_VERSION_PREFIX)) {
      throw new InvalidOpaqueCursorError(
        'Неподдерживаемый или повреждённый курсор (неизвестная версия формата). ' +
          'Используйте значение nextCursor из ответа resources/list.'
      );
    }

    const envelope = OpaqueCursorCodec.parseEnvelope(
      cursor.slice(OPAQUE_CURSOR_VERSION_PREFIX.length)
    );

    if (envelope.t !== expectedTag) {
      throw new InvalidOpaqueCursorError(
        'Курсор принадлежит другому семейству ресурсов и не может быть использован здесь.'
      );
    }

    return envelope.d as TPayload;
  }

  /**
   * Распарсить base64url-полезную нагрузку в валидный {@link CursorEnvelope}.
   *
   * @throws {InvalidOpaqueCursorError} при битом base64/JSON или неверной форме
   */
  private static parseEnvelope(b64: string): CursorEnvelope<unknown> {
    // Buffer.from(_, 'base64url') молча игнорирует посторонние символы, поэтому
    // строгий guard алфавита base64url (включая пустую строку) — иначе битый
    // курсор с «мусором» прошёл бы вместо явной ошибки.
    if (!/^[A-Za-z0-9_-]+$/.test(b64)) {
      throw new InvalidOpaqueCursorError('Курсор повреждён (недопустимые символы в payload).');
    }

    let json: string;
    try {
      json = Buffer.from(b64, 'base64url').toString('utf8');
    } catch {
      throw new InvalidOpaqueCursorError('Курсор повреждён (не удалось декодировать base64url).');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new InvalidOpaqueCursorError('Курсор повреждён (не удалось разобрать содержимое).');
    }

    if (!OpaqueCursorCodec.isEnvelope(parsed)) {
      throw new InvalidOpaqueCursorError('Курсор повреждён (неожиданная структура данных).');
    }

    return parsed;
  }

  /**
   * Type guard формы {@link CursorEnvelope}.
   */
  private static isEnvelope(value: unknown): value is CursorEnvelope<unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const record = value as Record<string, unknown>;
    return typeof record['t'] === 'string' && record['t'].length > 0 && 'd' in record;
  }
}
