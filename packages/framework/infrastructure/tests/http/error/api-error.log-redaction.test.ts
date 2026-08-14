/**
 * Тесты redaction: errorsData из ApiErrorClass не должен попадать дампом в лог.
 *
 * Контекст (пакет 1.1.D плана модернизации):
 * - errorsData хранит недокументированные, потенциально пользовательские детали ошибки API.
 * - Полное значение должно оставаться доступным только через объект ошибки (`error.errorsData`,
 *   `error.toJSON().errorsData` — для ответа MCP-клиенту).
 * - Инфраструктурный Logger (packages/framework/infrastructure/src/logging/logger.ts) уже
 *   реализует нужную дисциплину: `Logger.error()` для `instanceof Error` извлекает вручную
 *   только { message, stack, name } и не спредит остальные enumerable-поля ошибки
 *   (см. logger.ts, метод error()). Эти тесты фиксируют это поведение как контракт для
 *   errorsData — если оно когда-нибудь будет ослаблено (например, кто-то заменит ручную
 *   экстракцию на `{ ...error }` или `error.toJSON()`), тест должен упасть.
 */

import { describe, it, expect, vi } from 'vitest';
import { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure/http/error/api-error.class.js';

describe('errorsData: redaction в логах', () => {
  it('не должен попадать дампом в контекст, переданный в pino.error()', () => {
    const secretMarker = 'USER_SECRET_MARKER_7f3a';
    const errorsData = {
      securityLevel: 'protect_sensitive_data',
      leakedIfBroken: secretMarker,
    };
    const error = new ApiErrorClass(403, 'Forbidden', undefined, undefined, errorsData);

    const logger = new Logger({ level: 'error', pretty: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Spy на приватное поле для проверки вызовов
    const errorSpy = vi.spyOn(logger['pino'] as any, 'error');

    logger.error('Ошибка Трекера', error);

    expect(errorSpy).toHaveBeenCalled();
    const callArgs = errorSpy.mock.calls[0];
    const loggedPayload = JSON.stringify(callArgs?.[0]);

    // Контрольная проверка: маркер действительно достижим через сам объект ошибки —
    // если бы errorsData вообще не сохранялся, тест был бы бессмысленным (ложноположительным).
    expect(error.errorsData).toEqual(errorsData);

    // Собственно проверка redaction: маркер не должен просочиться в то, что уходит в pino.
    expect(loggedPayload).not.toContain(secretMarker);
    expect(loggedPayload).not.toContain('leakedIfBroken');

    // Отладочная польза не должна деградировать: message/name по-прежнему в логе.
    expect(loggedPayload).toContain('Forbidden');
    expect(loggedPayload).toContain('ApiErrorClass');

    errorSpy.mockRestore();
  });

  it('должен падать (был бы падающим), если бы errorsData логировался дампом целиком', () => {
    // Доказательство того, что предыдущий тест не бесполезен: наивная реализация
    // логирования (спред всего объекта ошибки) действительно потекла бы маркер.
    const secretMarker = 'USER_SECRET_MARKER_naive';
    const errorsData = { leakedIfBroken: secretMarker };
    const error = new ApiErrorClass(403, 'Forbidden', undefined, undefined, errorsData);

    const naiveLoggedPayload = JSON.stringify({
      error: { ...error, errorsData: error.errorsData },
    });

    expect(naiveLoggedPayload).toContain(secretMarker);
  });
});
