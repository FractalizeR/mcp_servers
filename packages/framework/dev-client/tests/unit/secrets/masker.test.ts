/**
 * Тесты маскирования: значение в середине строки, JSON-экранированная форма,
 * короткое значение (не маскируется), стек ошибки, вложенные JSON-структуры.
 */

import { describe, it, expect } from 'vitest';
import { createMasker, maskJsonValue } from '../../../src/secrets/masker.js';

const SECRET = 'y0_super_secret_token_ABCDEF123456';

describe('createMasker', () => {
  it('маскирует значение в середине строки', () => {
    const masker = createMasker({ clientEnv: { TOKEN: SECRET } });
    const text = `Ошибка авторизации: заголовок Authorization: Bearer ${SECRET} отклонён`;
    const masked = masker(text);
    expect(masked).not.toContain(SECRET);
    expect(masked).toContain('***MASKED***');
  });

  it('маскирует JSON-экранированную форму значения (обратный слэш и кавычки в секрете)', () => {
    const secretWithSpecials = 'sec\\ret"with/slash_and_quote_0123456789';
    const masker = createMasker({ clientEnv: { TOKEN: secretWithSpecials } });
    // Симулируем то, что происходит при сериализации: JSON.stringify экранирует \ и "
    const jsonText = JSON.stringify({ message: `token=${secretWithSpecials}` });
    const masked = masker(jsonText);
    expect(masked).not.toContain(secretWithSpecials);
    // Не должно остаться экранированной формы обратного слэша от секрета
    expect(masked).not.toContain('sec\\\\ret');
  });

  it('не маскирует короткие значения (< 6 символов) — например LOG_LEVEL=debug', () => {
    const masker = createMasker({ clientEnv: { LOG_LEVEL: 'debug', SHORT: 'ab' } });
    const text = 'Уровень логирования: debug, короткое значение: ab';
    expect(masker(text)).toBe(text);
  });

  it('НЕ маскирует длинные не-секретные значения родительского окружения (HOME/USER/PWD)', () => {
    // Регресс на H1: маскер, построенный из всех значений окружения, затирал
    // `HOME` в собственной диагностике (`Бандл не найден: ***MASKED***/dist/...`)
    // и в `content` ответов сервера.
    const masker = createMasker({
      clientEnv: {},
      parentEnv: {
        HOME: '/Users/fractalizer',
        USER: 'fractalizer',
        PWD: '/Users/fractalizer/PhpstormProjects/mcp_servers',
      },
    });
    const text =
      'Бандл не найден: /Users/fractalizer/PhpstormProjects/mcp_servers/dist/x.bundle.cjs';
    expect(masker(text)).toBe(text);
  });

  it('маскирует секрет из родительского окружения по чувствительному имени ключа', () => {
    // Обратная сторона того же H1: риск плана «ticktick читает токены из
    // process.env» обязан оставаться закрытым.
    const masker = createMasker({
      clientEnv: {},
      parentEnv: {
        HOME: '/Users/fractalizer',
        TICKTICK_ACCESS_TOKEN: SECRET,
        TICKTICK_CLIENT_SECRET: 'another-secret-value-987654',
      },
    });
    const masked = masker(
      `home=/Users/fractalizer token=${SECRET} secret=another-secret-value-987654`
    );
    expect(masked).toContain('/Users/fractalizer');
    expect(masked).not.toContain(SECRET);
    expect(masked).not.toContain('another-secret-value-987654');
  });

  it('маскирует значение записи клиента с неопознанным именем ключа (консервативный fallback)', () => {
    // Имена переменных конкретного MCP-сервера заранее не известны, поэтому
    // неопознанный ключ записи клиента считается секретом. Fallback объявлен
    // явно в `sensitivity.ts`, а не получается сам собой из «источник другой».
    const masker = createMasker({ clientEnv: { CUSTOM_THING: 'value-1234567890' } });
    expect(masker('x=value-1234567890')).toBe('x=***MASKED***');
  });

  it('НЕ маскирует заведомо несекретные значения записи клиента (N1: orgId/logLevel/apiBase)', () => {
    // Регресс на N1: `YANDEX_ORG_ID` — семизначное число, случайно совпадающее
    // с числами в тексте тикетов; `LOG_LEVEL=warning` — со словом в ответе.
    const masker = createMasker({
      clientEnv: {
        YANDEX_ORG_ID: '4823917',
        LOG_LEVEL: 'warning',
        YANDEX_TRACKER_API_BASE: 'https://api.tracker.yandex.net',
        REQUEST_TIMEOUT: '300000',
        TICKTICK_CLIENT_ID: 'client-abcdef123456',
        TICKTICK_REDIRECT_URI: 'http://localhost:8080/callback',
      },
    });
    const text =
      'Комментарий: смета на 4823917 руб., статус warning, база https://api.tracker.yandex.net, таймаут 300000, client-abcdef123456, http://localhost:8080/callback';
    expect(masker(text)).toBe(text);
  });

  it('маскирует токен записи клиента рядом с несекретными значениями той же записи', () => {
    const masker = createMasker({
      clientEnv: { YANDEX_ORG_ID: '4823917', YANDEX_TRACKER_TOKEN: SECRET },
    });
    const masked = masker(`org=4823917 token=${SECRET}`);
    expect(masked).toContain('4823917');
    expect(masked).not.toContain(SECRET);
  });

  it('маскирует распространённые формы секретов по имени ключа (N2: PAT/PWD/COOKIE/SESSION)', () => {
    const masker = createMasker({
      clientEnv: {},
      parentEnv: {
        GITHUB_PAT: 'ghp_leakme12345',
        DB_PWD: 'p4ssword-value-1',
        SERVICE_PASS: 'p4ssword-value-2',
        APP_COOKIE: 'sid=cookie-value-333',
        SESSION_ID: 'session-value-4444',
        SENTRY_DSN: 'https://examplekey@o1.ingest.sentry.io/1',
      },
    });
    const masked = masker(
      'pat=ghp_leakme12345 pwd=p4ssword-value-1 pass=p4ssword-value-2 cookie=sid=cookie-value-333 sid=session-value-4444 dsn=https://examplekey@o1.ingest.sentry.io/1'
    );
    for (const secret of [
      'ghp_leakme12345',
      'p4ssword-value-1',
      'p4ssword-value-2',
      'cookie-value-333',
      'session-value-4444',
      'examplekey@o1.ingest.sentry.io',
    ]) {
      expect(masked).not.toContain(secret);
    }
  });

  it('маскирует секрет по ФОРМЕ значения, а не по имени ключа (N2: connection-строка, PEM)', () => {
    // `DATABASE_URL` именем себя не выдаёт никогда — ловится парой `user:pass@`.
    const dbUrl = 'postgres://u:supersecretpw@host:5432/db';
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----';
    const masker = createMasker({
      clientEnv: {},
      parentEnv: { DATABASE_URL: dbUrl, DEPLOY_IDENTITY: pem },
    });
    const masked = masker(`url=${dbUrl} pem=${pem}`);
    expect(masked).not.toContain('supersecretpw');
    expect(masked).not.toContain('MIIEow');
  });

  it('форма значения побеждает список заведомо несекретных имён', () => {
    const withCreds = 'https://svc:hunter2secret@api.example.com';
    const masker = createMasker({ clientEnv: { SERVICE_API_BASE: withCreds } });
    expect(masker(`base=${withCreds}`)).toBe('base=***MASKED***');
  });

  it('НЕ маскирует PWD родительского окружения (сегмент PWD заведён ради *_PWD)', () => {
    const masker = createMasker({
      clientEnv: {},
      parentEnv: { PWD: '/Users/fractalizer/PhpstormProjects/mcp_servers' },
    });
    const text = 'cwd=/Users/fractalizer/PhpstormProjects/mcp_servers';
    expect(masker(text)).toBe(text);
  });

  it('маскирует значение ровно на пороге длины (6 символов)', () => {
    const masker = createMasker({ clientEnv: { TOKEN: 'abcdef' } });
    expect(masker('value=abcdef;')).toBe('value=***MASKED***;');
  });

  it('маскирует стек ошибки, содержащий секрет', () => {
    const masker = createMasker({ clientEnv: { TOKEN: SECRET } });
    const err = new Error(`Request failed with token ${SECRET}`);
    const masked = masker(err.stack ?? err.message);
    expect(masked).not.toContain(SECRET);
  });

  it('маскирует несколько разных секретов одновременно', () => {
    const masker = createMasker({
      clientEnv: {
        A: 'first-secret-value-123456',
        B: 'second-secret-value-654321',
      },
    });
    const masked = masker('a=first-secret-value-123456 b=second-secret-value-654321');
    expect(masked).not.toContain('first-secret-value-123456');
    expect(masked).not.toContain('second-secret-value-654321');
  });

  it('пустой env → identity-функция (не бросает, не искажает текст)', () => {
    const masker = createMasker({ clientEnv: {} });
    expect(masker('plain text')).toBe('plain text');
  });

  it('более длинный секрет маскируется первым, не оставляя частичный хвост от префикса-коллизии', () => {
    // "abcdefgh" — подстрока внутри более длинного значения; более длинный вариант
    // должен замаскироваться целиком, не разбившись на кусок + суффикс.
    const masker = createMasker({ clientEnv: { SHORT: 'abcdefgh', LONG: 'abcdefghijklmnop' } });
    const masked = masker('value=abcdefghijklmnop');
    expect(masked).toBe('value=***MASKED***');
  });
});

describe('maskJsonValue', () => {
  const masker = createMasker({ clientEnv: { TOKEN: SECRET } });

  it('маскирует строковые листья вложенной структуры перед сериализацией', () => {
    const value = {
      content: [{ type: 'text', text: `leaked: ${SECRET}` }],
      nested: { deeper: [SECRET, 'safe'] },
    };
    const masked = maskJsonValue(value, masker);
    const serialized = JSON.stringify(masked);
    expect(serialized).not.toContain(SECRET);
  });

  it('оставляет числа/boolean/null без изменений', () => {
    const value = { count: 42, ok: true, missing: null };
    expect(maskJsonValue(value, masker)).toEqual(value);
  });

  it('undefined остаётся undefined (не превращается в маскированную строку)', () => {
    expect(maskJsonValue(undefined, masker)).toBeUndefined();
  });
});
