/**
 * Единая шкала чувствительности значения окружения.
 *
 * Одна и та же шкала применяется к обоим источникам маскера (запись MCP-клиента
 * и родительское окружение процесса) — иначе источник значения начинает
 * определять правило, и обе ошибки возникают сразу: значения записи клиента
 * маскируются целиком (`YANDEX_ORG_ID=4823917` затирает семизначные числа в
 * тексте тикетов), а распространённые секреты родительского окружения
 * (`GITHUB_PAT`, пароль внутри `DATABASE_URL`) проходят мимо маски.
 *
 * Шкала состоит из трёх независимых признаков, применяемых в этом порядке:
 *  1. **форма значения** — connection-строка с парой `user:pass`, PEM-заголовок
 *     приватного ключа, JWT. Connection-строка именем ключа себя не выдаёт
 *     никогда (`DATABASE_URL`, `AMQP_URI`, `REDIS_HOST`), поэтому признак по
 *     форме обязан быть и обязан побеждать список «заведомо несекретных»;
 *  2. **заведомо несекретное имя ключа** — `LOG_LEVEL`, `*_TIMEOUT`,
 *     `*_API_BASE`, `*_ORG_ID`, `*_CLIENT_ID`, `*_REDIRECT_URI`. Маскировать их
 *     вреднее, чем пропустить: это идентификаторы и настройки, которые
 *     встречаются в ответах сервера и в собственной диагностике;
 *  3. **чувствительное имя ключа** — по сегментам имени (`FOO_BAR_TOKEN` →
 *     сегменты `FOO`,`BAR`,`TOKEN`), плюс подстрочный запасной признак для
 *     слитных имён без разделителя (`GITHUBTOKEN`).
 *
 * Если ни один признак не сработал, решает объявленный вызывающим fallback
 * источника (см. {@link EnvValueSource}).
 */

/**
 * Источник значения — определяет **только** поведение по умолчанию для ключа,
 * который ни один признак шкалы не опознал.
 *
 * - `clientEnv` → консервативный fallback «маскировать». Обоснование: имена
 *   переменных конкретного MCP-сервера мы не знаем заранее, а разработчик
 *   положил их в запись клиента именно потому, что сервер без них не работает.
 *   Цена ошибки в эту сторону ограничена списком заведомо несекретных ключей
 *   выше, поэтому fallback объявлен явно, а не получается сам собой.
 * - `parentEnv` → «не маскировать». Родительское окружение — это `HOME`,
 *   `USER`, `PWD`, `PATH`: маскирование путей превращает диагностику
 *   `missing`/`stale` и любой ответ сервера в нечитаемую кашу.
 */
export type EnvValueSource = 'clientEnv' | 'parentEnv';

/**
 * Сегменты имени, означающие секрет. Сравнение по **точному сегменту**, а не по
 * подстроке: подстрочный `KEY` ловил бы `MONKEY_NAME`, а подстрочный `PWD` —
 * рабочий каталог `PWD`, чьё маскирование и есть та самая порча диагностики.
 */
const SENSITIVE_SEGMENTS = new Set([
  'TOKEN',
  'TOKENS',
  'SECRET',
  'SECRETS',
  'KEY',
  'KEYS',
  'APIKEY',
  'PRIVATEKEY',
  'PASSWORD',
  'PASSWD',
  'PASS',
  'PWD',
  'PASSPHRASE',
  'CREDENTIAL',
  'CREDENTIALS',
  'CREDS',
  'AUTH',
  'BEARER',
  'COOKIE',
  'COOKIES',
  'SESSION',
  'DSN',
  'PAT',
  'SALT',
  'SIGNATURE',
  'CERT',
]);

/**
 * Ключи, чьё имя состоит из чувствительного сегмента, но секретом не является.
 * `PWD`/`OLDPWD` — рабочий каталог (сегмент `PWD` заведён ради `*_PWD` =
 * password), `SESSION_MANAGER` — адрес сокета X11.
 */
const NEVER_SENSITIVE_KEYS = new Set(['PWD', 'OLDPWD', 'SESSION_MANAGER']);

/**
 * Запасной подстрочный признак для слитных имён без разделителя
 * (`GITHUBTOKEN`, `MYAPIKEY`). Перечислены только корни, у которых нет
 * распространённых безобидных вхождений в качестве подстроки.
 */
const SENSITIVE_SUBSTRING_PATTERN = /(TOKEN|SECRET|PASSWORD|PASSPHRASE|CREDENTIAL|APIKEY)/;

/**
 * Заведомо несекретные ключи записи клиента — идентификаторы и настройки, а не
 * доступ. Перечень закрывает то, что реально кладут в записи серверов монорепо
 * (см. `build-launch.ts` серверов в `packages/servers`).
 */
const NON_SENSITIVE_KEY_PATTERN =
  /^(?:LOG_LEVEL|NODE_ENV|.*_(?:TIMEOUT|API_BASE|BASE_URL|ORG_ID|CLIENT_ID|REDIRECT_URI|LOG_LEVEL))$/;

/** Connection-строка с встроенной парой `user:password@host`. */
const URL_WITH_CREDENTIALS_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i;

/** PEM-заголовок приватного ключа (RSA/EC/OPENSSH/PGP — все варианты). */
const PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY( BLOCK)?-----/;

/** Компактная сериализация JWT: три base64url-сегмента, первые два начинаются с `ey`. */
const JWT_PATTERN = /^ey[A-Za-z0-9_-]{8,}\.ey[A-Za-z0-9_-]{8,}\./;

/** Значение выглядит секретом по своей форме, как бы ни назывался ключ. */
function valueLooksSecret(value: string): boolean {
  const trimmed = value.trim();
  return (
    URL_WITH_CREDENTIALS_PATTERN.test(trimmed) ||
    PRIVATE_KEY_PATTERN.test(trimmed) ||
    JWT_PATTERN.test(trimmed)
  );
}

/** Имя ключа выглядит именем секрета. */
function keyLooksSensitive(key: string): boolean {
  const upper = key.toUpperCase();
  if (NEVER_SENSITIVE_KEYS.has(upper)) return false;
  for (const segment of upper.split(/[_\-.]/)) {
    if (SENSITIVE_SEGMENTS.has(segment)) return true;
  }
  return SENSITIVE_SUBSTRING_PATTERN.test(upper);
}

/** Имя ключа явно объявлено несекретным (идентификатор/настройка). */
function keyLooksNonSensitive(key: string): boolean {
  return NON_SENSITIVE_KEY_PATTERN.test(key.toUpperCase());
}

/**
 * Решение шкалы для одной пары ключ/значение.
 *
 * @param source - Определяет ответ только для неопознанного ключа (см. {@link EnvValueSource}).
 */
export function isSensitiveEnvValue(key: string, value: string, source: EnvValueSource): boolean {
  if (valueLooksSecret(value)) return true;
  if (keyLooksNonSensitive(key)) return false;
  if (keyLooksSensitive(key)) return true;
  return source === 'clientEnv';
}
