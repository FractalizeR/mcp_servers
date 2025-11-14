/**
 * Генератор рандомизированных фикстур для интеграционных тестов
 * Используется для создания тестовых данных без утечки реальной информации
 */

/**
 * Генерирует случайную строку указанной длины
 */
function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Генерирует случайное число в диапазоне [min, max]
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Генерирует случайную дату в прошлом (до 365 дней назад)
 */
function randomPastDate(): string {
  const now = Date.now();
  const daysAgo = randomInt(1, 365);
  const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

/**
 * Генерирует случайный cloudUid
 */
function randomCloudUid(): string {
  return `${randomString(4)}${randomString(16)}`;
}

/**
 * Генерирует случайный passportUid
 */
function randomPassportUid(): number {
  return randomInt(1000000000, 9999999999);
}

/**
 * Варианты статусов задач
 */
const STATUSES = [
  { id: '1', key: 'open', display: 'Открыта' },
  { id: '2', key: 'inProgress', display: 'В работе' },
  { id: '3', key: 'resolved', display: 'Решена' },
  { id: '14', key: 'cancelled', display: 'Отменено' },
  { id: '25', key: 'asPlanned', display: 'По плану' },
];

/**
 * Варианты типов задач
 */
const ISSUE_TYPES = [
  { id: '1', key: 'bug', display: 'Ошибка' },
  { id: '2', key: 'task', display: 'Задача' },
  { id: '3', key: 'improvement', display: 'Улучшение' },
];

/**
 * Варианты приоритетов
 */
const PRIORITIES = [
  { id: '1', key: 'critical', display: 'Критический' },
  { id: '2', key: 'major', display: 'Важный' },
  { id: '3', key: 'normal', display: 'Средний' },
  { id: '4', key: 'minor', display: 'Низкий' },
];

/**
 * Варианты резолюций
 */
const RESOLUTIONS = [
  { id: '1', key: 'fixed', display: 'Решено' },
  { id: '2', key: 'wontFix', display: 'Не будет исправлено' },
  { id: '3', key: 'duplicate', display: 'Дубликат' },
];

/**
 * Генерирует пользователя с рандомизированными данными
 */
function generateUser() {
  const userId = randomString(24);
  const passportUid = randomPassportUid();
  const cloudUid = randomCloudUid();

  return {
    self: `https://api.tracker.yandex.net/v3/users/${userId}`,
    id: userId,
    display: `Тестовый Пользователь ${randomInt(1, 999)}`,
    cloudUid,
    passportUid,
  };
}

/**
 * Генерирует очередь с рандомизированными данными
 */
function generateQueue() {
  const queueKey = `TESTQ${randomInt(1, 99)}`;

  return {
    self: `https://api.tracker.yandex.net/v3/queues/${queueKey}`,
    id: String(randomInt(1, 999)),
    key: queueKey,
    display: queueKey,
  };
}

/**
 * Опции для генерации фикстуры задачи
 */
export interface GenerateIssueOptions {
  /** Ключ задачи (например, QUEUE-1) */
  issueKey: string;
  /** Саммари задачи (по умолчанию рандомизированное) */
  summary?: string;
  /** Ключ статуса (по умолчанию случайный) */
  statusKey?: string;
  /** Ключ типа задачи (по умолчанию случайный) */
  typeKey?: string;
  /** Ключ приоритета (по умолчанию случайный) */
  priorityKey?: string;
  /** Включить резолюцию (по умолчанию 50% вероятность) */
  includeResolution?: boolean;
}

/**
 * Генерирует фикстуру задачи с рандомизированными данными
 */
export function generateIssueFixture(options: GenerateIssueOptions): Record<string, unknown> {
  const {
    issueKey,
    summary = `Тестовая задача ${randomString(8)}`,
    statusKey,
    typeKey,
    priorityKey,
    includeResolution = Math.random() > 0.5,
  } = options;

  const issueId = randomString(24);
  const createdBy = generateUser();
  const updatedBy = generateUser();
  const assignee = generateUser();
  const queue = generateQueue();

  const status =
    STATUSES.find((s) => s.key === statusKey) ?? STATUSES[randomInt(0, STATUSES.length - 1)]!;
  const type =
    ISSUE_TYPES.find((t) => t.key === typeKey) ??
    ISSUE_TYPES[randomInt(0, ISSUE_TYPES.length - 1)]!;
  const priority =
    PRIORITIES.find((p) => p.key === priorityKey) ??
    PRIORITIES[randomInt(0, PRIORITIES.length - 1)]!;

  const createdAt = randomPastDate();
  const updatedAt = new Date(
    new Date(createdAt).getTime() + randomInt(1, 100) * 60 * 60 * 1000
  ).toISOString();

  const issue: Record<string, unknown> = {
    self: `https://api.tracker.yandex.net/v3/issues/${issueKey}`,
    id: issueId,
    key: issueKey,
    version: randomInt(1, 50),
    summary,
    statusStartTime: updatedAt,
    updatedBy,
    statusType: {
      id: status.key,
      display: status.display,
      key: status.key,
    },
    boards: [
      {
        id: randomInt(1, 100),
      },
    ],
    type: {
      self: `https://api.tracker.yandex.net/v3/issuetypes/${type.id}`,
      id: type.id,
      key: type.key,
      display: type.display,
    },
    priority: {
      self: `https://api.tracker.yandex.net/v3/priorities/${priority.id}`,
      id: priority.id,
      key: priority.key,
      display: priority.display,
    },
    previousStatusLastAssignee: assignee,
    createdAt,
    createdBy,
    commentWithoutExternalMessageCount: randomInt(0, 10),
    votes: randomInt(0, 5),
    commentWithExternalMessageCount: randomInt(0, 3),
    assignee,
    queue,
    updatedAt,
    status: {
      self: `https://api.tracker.yandex.net/v3/statuses/${status.id}`,
      id: status.id,
      key: status.key,
      display: status.display,
    },
    previousStatus: STATUSES[randomInt(0, STATUSES.length - 1)],
    favorite: Math.random() > 0.5,
  };

  if (includeResolution) {
    const resolution = RESOLUTIONS[randomInt(0, RESOLUTIONS.length - 1)]!;
    issue['resolution'] = {
      self: `https://api.tracker.yandex.net/v3/resolutions/${resolution.id}`,
      id: resolution.id,
      key: resolution.key,
      display: resolution.display,
    };
    issue['resolvedAt'] = updatedAt;
    issue['resolvedBy'] = assignee;
  }

  return issue;
}

/**
 * Генерирует фикстуру ошибки 404 (задача не найдена)
 */
export function generateError404Fixture() {
  return {
    statusCode: 404,
    errorMessages: ['Issue not found'],
    errors: {},
  };
}

/**
 * Генерирует фикстуру ошибки 401 (не авторизован)
 */
export function generateError401Fixture() {
  return {
    statusCode: 401,
    errorMessages: ['Authentication required'],
    errors: {},
  };
}

/**
 * Генерирует фикстуру ошибки 403 (доступ запрещён)
 */
export function generateError403Fixture() {
  return {
    statusCode: 403,
    errorMessages: ['Access denied'],
    errors: {},
  };
}
