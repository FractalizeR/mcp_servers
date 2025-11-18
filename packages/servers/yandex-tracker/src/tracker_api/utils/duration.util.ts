/**
 * Утилиты для работы с ISO 8601 Duration
 *
 * Конвертирует между человекочитаемым форматом ("1h 30m")
 * и ISO 8601 Duration format ("PT1H30M").
 *
 * ISO 8601 Duration format:
 * - P - prefix (period)
 * - T - separator (time component starts)
 * - nH - hours
 * - nM - minutes
 * - nS - seconds
 *
 * @example
 * ```typescript
 * DurationUtil.parseHumanReadable("1h 30m");  // "PT1H30M"
 * DurationUtil.toHumanReadable("PT1H30M");    // "1h 30m"
 * ```
 */

/**
 * Парсинг duration из человекочитаемого формата в ISO 8601
 */
export class DurationUtil {
  /**
   * Паттерны для распознавания различных форматов времени
   * Поддерживаемые форматы:
   * - "1h", "2h 30m", "45m"
   * - "1 hour", "2 hours 30 minutes", "45 minutes"
   * - "1hr", "2hrs 30min", "45min"
   */
  private static readonly HOURS_PATTERN = /(\d+)\s*(?:h|hour|hours|hr|hrs)(?:\s|$)/i;
  private static readonly MINUTES_PATTERN = /(\d+)\s*(?:m|minute|minutes|min|mins)(?:\s|$)/i;
  private static readonly SECONDS_PATTERN = /(\d+)\s*(?:s|second|seconds|sec|secs)(?:\s|$)/i;

  /**
   * Паттерн для валидации ISO 8601 Duration
   * Примеры: PT1H, PT30M, PT1H30M, PT1H30M45S
   */
  private static readonly ISO_DURATION_PATTERN = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

  /**
   * Конвертировать человекочитаемый формат в ISO 8601 Duration
   *
   * @param duration - продолжительность в человекочитаемом формате
   * @returns ISO 8601 Duration строка
   * @throws Error если формат невалидный или не содержит времени
   *
   * @example
   * ```typescript
   * DurationUtil.parseHumanReadable("1h");        // "PT1H"
   * DurationUtil.parseHumanReadable("30m");       // "PT30M"
   * DurationUtil.parseHumanReadable("1h 30m");    // "PT1H30M"
   * DurationUtil.parseHumanReadable("2 hours 15 minutes"); // "PT2H15M"
   * DurationUtil.parseHumanReadable("1hr 30min"); // "PT1H30M"
   * ```
   */
  static parseHumanReadable(duration: string): string {
    if (!duration || typeof duration !== 'string') {
      throw new Error('Duration must be a non-empty string');
    }

    const trimmed = duration.trim();
    if (trimmed.length === 0) {
      throw new Error('Duration must be a non-empty string');
    }

    // Проверка: не должна быть ISO 8601 Duration (начинается с "PT")
    if (trimmed.toUpperCase().startsWith('PT')) {
      throw new Error(
        `Invalid duration format: "${duration}". Expected format like "1h", "30m", "1h 30m", "2 hours 15 minutes"`
      );
    }

    // Проверка: не должно быть отрицательных чисел (минус в строке)
    if (trimmed.includes('-')) {
      throw new Error('Duration components must be non-negative');
    }

    // Извлекаем компоненты времени
    const hoursMatch = trimmed.match(this.HOURS_PATTERN);
    const minutesMatch = trimmed.match(this.MINUTES_PATTERN);
    const secondsMatch = trimmed.match(this.SECONDS_PATTERN);

    const hours = hoursMatch?.[1] ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch?.[1] ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch?.[1] ? parseInt(secondsMatch[1], 10) : 0;

    // Проверка: хотя бы один компонент должен быть > 0
    if (hours === 0 && minutes === 0 && seconds === 0) {
      throw new Error(
        `Invalid duration format: "${duration}". Expected format like "1h", "30m", "1h 30m", "2 hours 15 minutes"`
      );
    }

    // Валидация значений (дополнительная проверка, хотя паттерны не должны найти негативы)
    if (hours < 0 || minutes < 0 || seconds < 0) {
      throw new Error('Duration components must be non-negative');
    }

    if (minutes >= 60) {
      throw new Error('Minutes must be less than 60');
    }

    if (seconds >= 60) {
      throw new Error('Seconds must be less than 60');
    }

    // Собираем ISO 8601 Duration строку
    let iso = 'PT';
    if (hours > 0) {
      iso += `${hours}H`;
    }
    if (minutes > 0) {
      iso += `${minutes}M`;
    }
    if (seconds > 0) {
      iso += `${seconds}S`;
    }

    return iso;
  }

  /**
   * Конвертировать ISO 8601 Duration в человекочитаемый формат
   *
   * @param iso - ISO 8601 Duration строка
   * @returns человекочитаемая строка
   * @throws Error если формат невалидный
   *
   * @example
   * ```typescript
   * DurationUtil.toHumanReadable("PT1H");      // "1h"
   * DurationUtil.toHumanReadable("PT30M");     // "30m"
   * DurationUtil.toHumanReadable("PT1H30M");   // "1h 30m"
   * DurationUtil.toHumanReadable("PT2H15M30S"); // "2h 15m 30s"
   * ```
   */
  static toHumanReadable(iso: string): string {
    if (!iso || typeof iso !== 'string') {
      throw new Error('ISO duration must be a non-empty string');
    }

    const trimmed = iso.trim();
    if (!this.ISO_DURATION_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid ISO 8601 Duration format: "${iso}". Expected format like "PT1H", "PT30M", "PT1H30M"`
      );
    }

    const match = trimmed.match(this.ISO_DURATION_PATTERN);
    if (!match) {
      // Этого не должно произойти после проверки выше
      throw new Error(`Failed to parse ISO duration: "${iso}"`);
    }

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    // Проверка: хотя бы один компонент должен быть > 0
    if (hours === 0 && minutes === 0 && seconds === 0) {
      throw new Error(`Invalid ISO duration: "${iso}" has zero duration`);
    }

    // Собираем человекочитаемую строку
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    if (seconds > 0) {
      parts.push(`${seconds}s`);
    }

    return parts.join(' ');
  }

  /**
   * Проверить, является ли строка валидным ISO 8601 Duration
   *
   * @param iso - строка для проверки
   * @returns true если строка валидна
   *
   * @example
   * ```typescript
   * DurationUtil.isValidIsoDuration("PT1H30M");  // true
   * DurationUtil.isValidIsoDuration("1h 30m");   // false
   * DurationUtil.isValidIsoDuration("PT0H");     // false (zero duration)
   * ```
   */
  static isValidIsoDuration(iso: string): boolean {
    if (!iso || typeof iso !== 'string') {
      return false;
    }

    const trimmed = iso.trim();
    if (!this.ISO_DURATION_PATTERN.test(trimmed)) {
      return false;
    }

    const match = trimmed.match(this.ISO_DURATION_PATTERN);
    if (!match) {
      return false;
    }

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    // Хотя бы один компонент должен быть > 0
    return hours > 0 || minutes > 0 || seconds > 0;
  }

  /**
   * Конвертировать ISO 8601 Duration в общее количество минут
   *
   * Полезно для сравнения и сортировки duration.
   *
   * @param iso - ISO 8601 Duration строка
   * @returns общее количество минут
   * @throws Error если формат невалидный
   *
   * @example
   * ```typescript
   * DurationUtil.toTotalMinutes("PT1H30M");  // 90
   * DurationUtil.toTotalMinutes("PT45M");    // 45
   * DurationUtil.toTotalMinutes("PT2H");     // 120
   * ```
   */
  static toTotalMinutes(iso: string): number {
    if (!this.isValidIsoDuration(iso)) {
      throw new Error(`Invalid ISO 8601 Duration: "${iso}"`);
    }

    const match = iso.trim().match(this.ISO_DURATION_PATTERN);
    if (!match) {
      throw new Error(`Failed to parse ISO duration: "${iso}"`);
    }

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    return hours * 60 + minutes + Math.ceil(seconds / 60);
  }
}
