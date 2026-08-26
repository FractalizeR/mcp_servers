/**
 * Сплошная сверка маршрутов сервера с текущим справочником API Трекера.
 *
 * Повод: `POST /v3/boards` не отвечал ошибкой — он молча создавал доску с
 * параметрами по умолчанию, игнорируя тело (D9). Такую мину не ловят ни тесты
 * на моках, ни живой прогон, который смотрит только на код ответа. Ловит её
 * сверка с документацией: маршрута нет на своей странице, либо есть, но помечен
 * устаревшим, либо ключ тела на странице не упомянут.
 *
 * Наша сторона — `outgoing-requests.md` (см. enumerate-outgoing-requests.ts)
 * плюс MANUAL_ROUTES: инструменты, чей запрос перечислитель не ловит, потому что
 * до HTTP они не доходят на синтетическом образце.
 *
 * Запуск: npm run sweep:doc-routes [-- --refresh] [-- --out <файл>]
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DOC_BASE = 'https://yandex.ru/support/tracker/ru/';
/** Страница-затравка: оглавление справочника вложено в любую из них. */
const SEED_PAGE = 'api-ref/boards/post-board';
const CACHE_DIR = join(tmpdir(), 'tracker-doc-sweep');
/** Страница справочника весит сотни КБ; всё, что меньше, — обрыв или 404. */
const MIN_PAGE_BYTES = 50_000;
const FETCH_RETRIES = 3;

/**
 * Маршруты инструментов, отсутствующих в outgoing-requests.md: на синтетическом
 * образце они возвращаются до HTTP. Пути сняты чтением операций — при переносе
 * маршрута правится здесь же, иначе сверка молча перестанет их покрывать.
 */
const MANUAL_ROUTES: OurCall[] = [
  {
    tool: 'fr_yandex_tracker_find_issues',
    method: 'POST',
    path: '/v3/issues/_search',
    bodyKeys: [],
  },
  {
    tool: 'fr_yandex_tracker_get_issue_changelog',
    method: 'GET',
    path: '/v3/issues/TEST-1/changelog',
    bodyKeys: [],
  },
  { tool: 'fr_yandex_tracker_get_queues', method: 'GET', path: '/v3/queues', bodyKeys: [] },
  {
    tool: 'fr_yandex_tracker_get_issue_links',
    method: 'GET',
    path: '/v3/issues/TEST-1/links',
    bodyKeys: [],
  },
  {
    tool: 'fr_yandex_tracker_get_comments',
    method: 'GET',
    path: '/v3/issues/TEST-1/comments',
    bodyKeys: [],
  },
  {
    tool: 'fr_yandex_tracker_get_checklist',
    method: 'GET',
    path: '/v3/issues/TEST-1/checklistItems',
    bodyKeys: [],
  },
  {
    tool: 'fr_yandex_tracker_get_worklogs',
    method: 'GET',
    path: '/v3/issues/TEST-1/worklog',
    bodyKeys: [],
  },
  {
    tool: 'fr_yandex_tracker_find_entities',
    method: 'POST',
    path: '/v3/entities/goal/_search',
    bodyKeys: [],
  },
  { tool: 'fr_yandex_tracker_find_users', method: 'GET', path: '/v3/users', bodyKeys: [] },
  {
    tool: 'fr_yandex_tracker_search_worklog',
    method: 'POST',
    path: '/v3/worklog/_search',
    bodyKeys: [],
  },
];

/**
 * Ключи тела, которых на странице маршрута не будет никогда: это не поля API,
 * а заглушки генератора синтетических образцов (`z.record()` → `markerKey`).
 */
const SAMPLE_ARTEFACT_KEYS = new Set(['markerKey']);

/**
 * Ключи, которых на странице маршрута нет, но живая проба показала, что API их
 * принимает и сохраняет: расхождение — неполнота документации, а не дефект.
 *
 * Список нужен, чтобы каждая следующая сверка не поднимала заново уже закрытые
 * вопросы. Запись сюда добавляется ТОЛЬКО после живой пробы с чтением результата;
 * дата в причине — когда проба сделана.
 */
const LIVE_VERIFIED_KEYS = new Map<string, Set<string>>([
  ['fr_yandex_tracker_create_queue', new Set(['description'])],
  // `orderBy`/`orderAsc` доезжают вместе с `filter` — проверено 2026-08-26 на доске 108
  // (чтение отдало `priority`/`true`, версия 1→2). `useRanking` доезжает отдельно
  // (`false` → `true`, версия 2→3).
  [
    'fr_yandex_tracker_update_board',
    new Set(['filter', 'query', 'orderBy', 'orderAsc', 'useRanking']),
  ],
  ['fr_yandex_tracker_update_board_column', new Set(['limit'])],
  ['fr_yandex_tracker_update_issue', new Set(['assignee'])],
  ['fr_yandex_tracker_update_worklog', new Set(['start'])],
  ['fr_yandex_tracker_create_sprint', new Set(['status'])],
]);

interface OurCall {
  tool: string;
  method: string;
  path: string;
  bodyKeys: string[];
}

interface DocRoute {
  page: string;
  /** canonical — блок «Формат запроса»; example — пример вызова в тексте. */
  kind: 'canonical' | 'example';
  method: string;
  path: string;
}

interface DocPage {
  page: string;
  section: string;
  routes: DocRoute[];
  text: string;
  deprecationNotes: string[];
}

async function fetchPage(path: string): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const file = join(CACHE_DIR, `${path.replace(/\//g, '_')}.html`);
  const refresh = process.argv.includes('--refresh');
  if (!refresh && existsSync(file) && statSync(file).size >= MIN_PAGE_BYTES) {
    return readFileSync(file, 'utf8');
  }
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    const response = await fetch(DOC_BASE + path);
    const html = await response.text();
    // Обрыв отдаётся пустым телом с кодом 200 — по коду ответа его не отличить.
    if (response.ok && html.length >= MIN_PAGE_BYTES) {
      writeFileSync(file, html, 'utf8');
      return html;
    }
    if (attempt === FETCH_RETRIES) {
      throw new Error(
        `${path}: ${response.status}, ${html.length} байт после ${FETCH_RETRIES} попыток`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw new Error(`${path}: недостижимо`);
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

/** Текст статьи без левого оглавления и без JSON-дубля страницы в конце. */
function articleLines(html: string): string[] {
  const body = html.split('window.__DATA__')[0] ?? html;
  const plain = decodeEntities(
    body
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, '\n')
  );
  const lines = plain
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const start = lines.indexOf('В этой статье');
  return start > 0 ? lines.slice(start) : lines;
}

function normalizePath(raw: string): string {
  return raw.trim().replace(/^https?:\/\/[^/]+/, '');
}

function parsePage(page: string, html: string): DocPage {
  const body = html.split('window.__DATA__')[0] ?? html;
  const routes: DocRoute[] = [];

  // Канонический блок: <div class="request_example method_post"><p>POST</p><pre><code>URL</code></pre>
  const canonical =
    /<div class="request_example method_\w+[^"]*">\s*<p>([A-Z]+)<\/p>\s*<pre><code>([\s\S]*?)<\/code><\/pre>/g;
  for (const match of body.matchAll(canonical)) {
    const path = normalizePath(stripTags(match[2] ?? ''));
    if (path.startsWith('/v'))
      routes.push({ page, kind: 'canonical', method: match[1] ?? '', path });
  }

  // Примеры вызовов: <pre><code class="hljs json">POST /v3/... \n Host: ...
  const example = /<pre><code class="hljs[^"]*">((?:GET|POST|PATCH|PUT|DELETE)\s[^\n]*)/g;
  for (const match of body.matchAll(example)) {
    const head = /^(GET|POST|PATCH|PUT|DELETE)\s+(\S+)/.exec(stripTags(match[1] ?? ''));
    if (!head) continue;
    const path = normalizePath(head[2] ?? '');
    if (path.startsWith('/v') && !routes.some((r) => r.method === head[1] && r.path === path)) {
      routes.push({ page, kind: 'example', method: head[1] ?? '', path });
    }
  }

  const lines = articleLines(html);
  // Хлебная крошка идёт последним вхождением «Справочник API» — первое в оглавлении.
  const crumb = lines.lastIndexOf('Справочник API');
  const deprecated = /устарел|устаревш|не рекомендуется|deprecated/i;
  const notes = lines
    .map((line, index) =>
      deprecated.test(line) ? lines.slice(Math.max(0, index - 3), index + 3).join(' ') : ''
    )
    .filter((note) => note.length > 0)
    .map((note) => note.slice(0, 400));

  return {
    page,
    section: crumb >= 0 ? (lines[crumb + 1] ?? '') : '',
    routes,
    text: lines.join(' '),
    deprecationNotes: notes,
  };
}

function readOurCalls(file: string): OurCall[] {
  const row =
    /^\|\s*`(fr_yandex_tracker_\w+)`\s*\|[^|]*\|[^|]*\|\s*(GET|POST|PATCH|PUT|DELETE)\s*\|\s*`([^`]+)`\s*\|([^|]*)\|/;
  const calls: OurCall[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = row.exec(line);
    if (!match) continue;
    const keys = (match[4] ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0 && key !== '—');
    calls.push({
      tool: match[1] ?? '',
      method: match[2] ?? '',
      path: (match[3] ?? '').trim(),
      bodyKeys: keys,
    });
  }
  return [...calls, ...MANUAL_ROUTES];
}

/** Ключ тела может содержать `-` и `.`; без экранирования он стал бы шаблоном. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Часть статьи до раздела «Формат ответа».
 *
 * Искать ключ тела по всей странице нельзя: имя, встречающееся только в описании
 * ОТВЕТА, засчитывалось бы как документированный параметр запроса. Именно так `version`
 * у правки доски выглядел документированным, хотя API отвечает на него 400.
 */
function requestSection(text: string): string {
  // Заголовки повторяются в оглавлении статьи в самом её начале, поэтому берётся
  // ПОСЛЕДНЕЕ вхождение: первое обрезало бы страницу до нескольких строк.
  const responseHeading = text.lastIndexOf('Формат ответа');
  return responseHeading > 0 ? text.slice(0, responseHeading) : text;
}

/** Сегмент-переменная: плейсхолдер документации либо подставное значение образца. */
const VARIABLE_SEGMENT = /^(\{.*\}|<.*>|probe_.*|[A-Z]+-\d+|\d+|__.*|.*\*\*\*.*)$/;

function segments(path: string): string[] {
  return (path.split('?')[0] ?? '')
    .replace(/\/+$/, '')
    .split('/')
    .filter((segment) => segment.length > 0);
}

function samePath(ours: string[], theirs: string[]): boolean {
  if (ours.length !== theirs.length) return false;
  return ours.every((segment, index) => {
    const other = theirs[index] ?? '';
    if (VARIABLE_SEGMENT.test(segment) || VARIABLE_SEGMENT.test(other)) return true;
    return segment.toLowerCase() === other.toLowerCase();
  });
}

interface Verdict {
  call: OurCall;
  pages: string[];
  unknownBodyKeys: string[];
  /** Расхождения, закрытые живой пробой: документация неполна, код верен. */
  settledBodyKeys: string[];
}

function judge(calls: OurCall[], pages: DocPage[]): Verdict[] {
  const routes = pages.flatMap((page) => page.routes);
  return calls.map((call) => {
    const ours = segments(call.path);
    const hits = routes.filter(
      (route) => route.method === call.method && samePath(ours, segments(route.path))
    );
    const hitPages = [...new Set(hits.map((hit) => hit.page))].sort();
    const blob = pages
      .filter((page) => hitPages.includes(page.page))
      .map((page) => requestSection(page.text))
      .join(' ');
    const verified = LIVE_VERIFIED_KEYS.get(call.tool);
    const absent = call.bodyKeys.filter(
      (key) =>
        !SAMPLE_ARTEFACT_KEYS.has(key) &&
        !new RegExp(`(?<![\\w-])${escapeForRegExp(key)}(?![\\w-])`).test(blob)
    );
    const empty: string[] = [];
    return {
      call,
      pages: hitPages,
      unknownBodyKeys:
        hitPages.length > 0 ? absent.filter((key) => verified?.has(key) !== true) : empty,
      settledBodyKeys: hitPages.length > 0 ? absent.filter((key) => verified?.has(key)) : empty,
    };
  });
}

function report(verdicts: Verdict[], pages: DocPage[]): string {
  const missing = verdicts.filter((verdict) => verdict.pages.length === 0);
  const bodyDrift = verdicts.filter((verdict) => verdict.unknownBodyKeys.length > 0);
  const settled = verdicts.filter((verdict) => verdict.settledBodyKeys.length > 0);
  // Маршрут без страницы: ключи тела не с чем сверять. Молчание отчёта об этом
  // читалось бы как «расхождений нет» — ровно та подмена, ради которой сверка заведена.
  const unchecked = verdicts.filter(
    (verdict) => verdict.pages.length === 0 && verdict.call.bodyKeys.length > 0
  );
  const legacySections = [...new Set(pages.map((page) => page.section))].filter((section) =>
    /стар|устар|deprecat|legacy/i.test(section)
  );

  const lines = [
    '# Сверка маршрутов сервера со справочником API Трекера',
    '',
    `Снято: ${new Date().toISOString().slice(0, 10)}. Страниц справочника: ${pages.length}. ` +
      `Маршрутов в документации: ${pages.flatMap((page) => page.routes).length}. ` +
      `Наших вызовов: ${verdicts.length}.`,
    '',
    `## Маршруты, которых нет в документации (${missing.length})`,
    '',
    'Отсутствие страницы само по себе не дефект: часть живых маршрутов не описана.',
    'Каждый пункт требует живой пробы — читающий маршрут проверяется `raw_api_request`,',
    'пишущий безопасно не проверить.',
    '',
    '| Метод | Путь | Инструмент |',
    '|---|---|---|',
    ...missing.map(
      (verdict) =>
        `| ${verdict.call.method} | \`${verdict.call.path}\` | \`${verdict.call.tool}\` |`
    ),
    '',
    `## Ключи тела, не упомянутые на странице своего маршрута (${bodyDrift.length})`,
    '',
    'Кандидаты класса D9 (API принимает запрос, ключ игнорирует, инструмент рапортует',
    'об успехе) — но НЕ доказанные дефекты. Ищется вхождение имени в раздел ЗАПРОСА',
    'страницы; справочник Трекера неполон, поэтому отсутствие имени означает «проверь',
    'живьём», а не «параметр не работает». Проверенное живой пробой переносится в',
    '`LIVE_VERIFIED_KEYS`, чтобы не всплывать в каждой следующей сверке.',
    '',
    '| Инструмент | Метод и путь | Ключи | Страницы |',
    '|---|---|---|---|',
    ...bodyDrift.map(
      (verdict) =>
        `| \`${verdict.call.tool}\` | ${verdict.call.method} \`${verdict.call.path.split('?')[0] ?? ''}\` ` +
        `| ${verdict.unknownBodyKeys.join(', ')} | ${verdict.pages.join(', ')} |`
    ),
    '',
    `## Ключи тела, не проверенные ни с чем (${unchecked.length})`,
    '',
    'У маршрута нет страницы справочника — сверять ключи тела не с чем. Это НЕ',
    '«расхождений нет»: для этих инструментов проверка класса D9 не выполнялась вовсе.',
    '',
    ...(unchecked.length === 0
      ? ['Нет.']
      : unchecked.map(
          (verdict) =>
            `- \`${verdict.call.tool}\` — ${verdict.call.method} ` +
            `\`${verdict.call.path.split('?')[0] ?? ''}\`: ${verdict.call.bodyKeys.join(', ')}`
        )),
    '',
    `## Расхождения, закрытые живой пробой (${settled.length})`,
    '',
    'Ключа нет на странице маршрута, но API его принимает и сохраняет — неполнота',
    'документации. Перепроверять не нужно; список ведётся в `LIVE_VERIFIED_KEYS`.',
    '',
    ...(settled.length === 0
      ? ['Нет.']
      : settled.map(
          (verdict) => `- \`${verdict.call.tool}\` — ${verdict.settledBodyKeys.join(', ')}`
        )),
    '',
    `## Разделы справочника с пометкой устаревания (${legacySections.length})`,
    '',
    ...(legacySections.length === 0
      ? ['Нет.']
      : legacySections.flatMap((section) => [
          `### ${section}`,
          '',
          ...pages
            .filter((page) => page.section === section)
            .map((page) => {
              const routes = page.routes.map((route) => `${route.method} ${route.path}`);
              return `- \`${page.page}\` — ${routes.join('; ')}`;
            }),
          '',
        ])),
    '',
    '## Пометки устаревания внутри страниц наших маршрутов',
    '',
  ];

  const ourPages = new Set(verdicts.flatMap((verdict) => verdict.pages));
  for (const page of pages.filter((p) => ourPages.has(p.page) && p.deprecationNotes.length > 0)) {
    lines.push(`### ${page.page}`, '');
    for (const note of page.deprecationNotes) lines.push(`- ${note}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const seed = await fetchPage(SEED_PAGE);
  const toc = [
    ...new Set([...seed.matchAll(/api-ref\/[a-z0-9-]+\/[a-z0-9-]+/g)].map((match) => match[0])),
  ].sort();
  process.stdout.write(`Страниц справочника в оглавлении: ${toc.length}\n`);

  const pages: DocPage[] = [];
  for (const page of toc) {
    try {
      pages.push(parsePage(page, await fetchPage(page)));
    } catch (error) {
      // Оглавление справочника содержит и битые ссылки — это не повод ронять сверку.
      process.stdout.write(`  пропущена ${page}: ${(error as Error).message}\n`);
    }
  }

  const outFlag = process.argv.indexOf('--out');
  const outPath =
    outFlag > 0 ? (process.argv[outFlag + 1] ?? 'doc-route-sweep.md') : 'doc-route-sweep.md';
  const verdicts = judge(readOurCalls('outgoing-requests.md'), pages);
  writeFileSync(outPath, report(verdicts, pages), 'utf8');

  const missing = verdicts.filter((verdict) => verdict.pages.length === 0).length;
  const drift = verdicts.filter((verdict) => verdict.unknownBodyKeys.length > 0).length;
  const unchecked = verdicts.filter(
    (verdict) => verdict.pages.length === 0 && verdict.call.bodyKeys.length > 0
  ).length;
  // Ненулевой код: артефакт устаревает молча, если сверка всегда «успешна». В
  // `validate` шаг не входит намеренно — он ходит в сеть за 156 страницами.
  const rotten = missing + drift + unchecked + (toc.length - pages.length);
  process.exitCode = rotten > 0 ? 1 : 0;

  process.stdout.write(
    `Разобрано страниц: ${pages.length} из ${toc.length}\n` +
      `Наших вызовов: ${verdicts.length}; без страницы: ${missing}; ` +
      `с чужими ключами тела: ${drift}; ключи тела не проверены: ${unchecked}\n` +
      `Отчёт: ${outPath}\n`
  );
}

void main();
