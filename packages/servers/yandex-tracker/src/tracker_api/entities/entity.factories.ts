/**
 * Фабрики для создания Entity объектов в тестах
 *
 * ВАЖНО: Эти фабрики создают валидные Entity объекты для тестирования.
 * Используются для unit и integration тестов.
 */

import type { User } from './user.entity.js';
import type { UserRef } from './common/user-ref.entity.js';
import type { Queue, QueueDictionaryRef } from './queue.entity.js';
import type { QueueField, QueueFieldCategory } from './queue-field.entity.js';
import type { QueuePermission } from './queue-permission.entity.js';
import type { Status } from './status.entity.js';
import type { Priority } from './priority.entity.js';
import type { IssueType } from './issue-type.entity.js';
import type { Issue } from './issue.entity.js';
import type { Transition } from './transition.entity.js';
import type { ChangelogEntry, ChangelogField } from './changelog.entity.js';
import type { Attachment } from './attachment.entity.js';

/**
 * Создает валидный User entity
 */
export function createUser(overrides?: Partial<User>): User {
  return {
    uid: '1234567890',
    display: 'Test User',
    login: 'testuser',
    isActive: true,
    email: 'testuser@example.com',
    ...overrides,
  };
}

/**
 * Создает минимальный User entity (без опциональных полей)
 */
export function createMinimalUser(overrides?: Partial<User>): User {
  return {
    uid: '1234567890',
    display: 'Test User',
    login: 'testuser',
    isActive: true,
    ...overrides,
  };
}

/**
 * Создает валидный UserRef (облегченная версия User)
 */
export function createUserRef(overrides?: Partial<UserRef>): UserRef {
  return {
    self: 'https://api.tracker.yandex.net/v3/users/1234567890',
    id: '1234567890',
    display: 'Test User',
    ...overrides,
  };
}

/**
 * Создает валидный QueueDictionaryRef
 */
export function createQueueDictionaryRef(
  overrides?: Partial<QueueDictionaryRef>
): QueueDictionaryRef {
  return {
    id: '1',
    key: 'task',
    display: 'Task',
    ...overrides,
  };
}

/**
 * Создает валидный Queue entity (только обязательные поля)
 */
export function createQueue(overrides?: Partial<Queue>): Queue {
  return {
    id: '1',
    self: 'https://api.tracker.yandex.net/v3/queues/TEST',
    key: 'TEST',
    version: 1,
    name: 'Test Queue',
    lead: createUserRef(),
    assignAuto: false,
    defaultType: createQueueDictionaryRef({ key: 'task', display: 'Task' }),
    defaultPriority: createQueueDictionaryRef({ key: 'normal', display: 'Normal' }),
    ...overrides,
  };
}

/**
 * Создает полный Queue entity (со всеми опциональными полями)
 */
export function createFullQueue(overrides?: Partial<Queue>): Queue {
  return {
    id: '1',
    self: 'https://api.tracker.yandex.net/v3/queues/TEST',
    key: 'TEST',
    version: 1,
    name: 'Test Queue',
    description: 'Test Queue Description',
    lead: createUserRef(),
    assignAuto: false,
    defaultType: createQueueDictionaryRef({ key: 'task', display: 'Task' }),
    defaultPriority: createQueueDictionaryRef({ key: 'normal', display: 'Normal' }),
    issueTypes: [
      createQueueDictionaryRef({ key: 'task', display: 'Task' }),
      createQueueDictionaryRef({ id: '2', key: 'bug', display: 'Bug' }),
    ],
    denyVoting: false,
    ...overrides,
  };
}

/**
 * Создает валидный QueueField entity
 */
export function createQueueField(overrides?: Partial<QueueField>): QueueField {
  return {
    id: 'summary',
    key: 'summary',
    name: 'Summary',
    required: true,
    type: 'string',
    ...overrides,
  };
}

/**
 * Создает валидный QueueField entity с категорией
 */
export function createQueueFieldWithCategory(overrides?: Partial<QueueField>): QueueField {
  const category: QueueFieldCategory = {
    id: 'system',
    display: 'System Fields',
  };
  return {
    id: 'assignee',
    key: 'assignee',
    name: 'Assignee',
    required: false,
    type: 'user',
    category,
    ...overrides,
  };
}

/**
 * Создает валидный QueuePermission entity
 */
export function createQueuePermission(overrides?: Partial<QueuePermission>): QueuePermission {
  return {
    id: 'user123',
    self: 'https://api.tracker.yandex.net/v3/users/user123',
    display: 'Test User',
    ...overrides,
  };
}

/**
 * Создает валидный Status entity
 */
export function createStatus(overrides?: Partial<Status>): Status {
  return {
    id: '1',
    key: 'open',
    display: 'Open',
    ...overrides,
  };
}

/**
 * Создает валидный Priority entity
 */
export function createPriority(overrides?: Partial<Priority>): Priority {
  return {
    id: '1',
    key: 'normal',
    display: 'Normal',
    ...overrides,
  };
}

/**
 * Создает валидный IssueType entity
 * Note: Похож на createQueueDictionaryRef, но создает разные типы
 */
// eslint-disable-next-line sonarjs/no-identical-functions
export function createIssueType(overrides?: Partial<IssueType>): IssueType {
  return {
    id: '1',
    key: 'task',
    display: 'Task',
    ...overrides,
  };
}

/**
 * Создает минимальный Issue entity (только обязательные поля)
 */
export function createMinimalIssue(overrides?: Partial<Issue>): Issue {
  return {
    id: '1',
    key: 'TEST-1',
    summary: 'Test issue',
    queue: createQueue(),
    status: createStatus(),
    createdBy: createUser(),
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Создает полный Issue entity (со всеми опциональными полями)
 */
export function createFullIssue(overrides?: Partial<Issue>): Issue {
  return {
    id: '1',
    key: 'TEST-1',
    summary: 'Test issue',
    description: 'Test description',
    queue: createQueue(),
    status: createStatus(),
    createdBy: createUser(),
    assignee: createUser({ login: 'assignee' }),
    priority: createPriority(),
    type: createIssueType(),
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Создает валидный Transition entity (без screen)
 */
export function createSimpleTransition(overrides?: Partial<Transition>): Transition {
  return {
    id: '1',
    self: 'https://tracker.yandex.ru/v3/issues/TEST-1/transitions/1',
    to: createStatus({ key: 'in_progress', display: 'In Progress' }),
    ...overrides,
  };
}

/**
 * Создает валидный Transition entity (с screen)
 */
export function createTransitionWithScreen(overrides?: Partial<Transition>): Transition {
  return {
    id: '1',
    self: 'https://tracker.yandex.ru/v3/issues/TEST-1/transitions/1',
    to: createStatus({ key: 'resolved', display: 'Resolved' }),
    screen: {
      id: 'screen-1',
      self: 'https://tracker.yandex.ru/v3/screens/screen-1',
    },
    ...overrides,
  };
}

/**
 * Создает валидный ChangelogField
 */
export function createChangelogField(overrides?: Partial<ChangelogField>): ChangelogField {
  return {
    field: {
      id: 'status',
      display: 'Status',
    },
    from: { key: 'open', display: 'Open' },
    to: { key: 'in_progress', display: 'In Progress' },
    ...overrides,
  };
}

/**
 * Создает минимальный ChangelogEntry (только обязательные поля)
 */
export function createMinimalChangelogEntry(overrides?: Partial<ChangelogEntry>): ChangelogEntry {
  return {
    id: '1',
    self: 'https://tracker.yandex.ru/v3/issues/TEST-1/changelog/1',
    issue: {
      id: '1',
      key: 'TEST-1',
      display: 'Test issue',
    },
    updatedAt: '2024-01-01T00:00:00.000Z',
    updatedBy: createUser(),
    type: 'IssueUpdated',
    ...overrides,
  };
}

/**
 * Создает полный ChangelogEntry (с полями изменений)
 */
export function createFullChangelogEntry(overrides?: Partial<ChangelogEntry>): ChangelogEntry {
  return {
    id: '1',
    self: 'https://tracker.yandex.ru/v3/issues/TEST-1/changelog/1',
    issue: {
      id: '1',
      key: 'TEST-1',
      display: 'Test issue',
    },
    updatedAt: '2024-01-01T00:00:00.000Z',
    updatedBy: createUser(),
    type: 'IssueUpdated',
    transport: 'web',
    fields: [createChangelogField()],
    ...overrides,
  };
}

/**
 * Создает валидный Attachment entity
 */
export function createAttachment(overrides?: Partial<Attachment>): Attachment {
  return {
    id: '1',
    self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/attachments/1',
    name: 'test-file.pdf',
    content: 'https://api.tracker.yandex.net/v2/issues/TEST-1/attachments/1/test-file.pdf',
    createdBy: createUserRef(),
    createdAt: '2024-01-01T00:00:00.000Z',
    mimetype: 'application/pdf',
    size: 1024,
    ...overrides,
  };
}

/**
 * Создает Attachment entity с миниатюрой (для изображений)
 */
export function createAttachmentWithThumbnail(overrides?: Partial<Attachment>): Attachment {
  return {
    id: '1',
    self: 'https://api.tracker.yandex.net/v2/issues/TEST-1/attachments/1',
    name: 'screenshot.png',
    content: 'https://api.tracker.yandex.net/v2/issues/TEST-1/attachments/1/screenshot.png',
    thumbnail: 'https://api.tracker.yandex.net/v2/issues/TEST-1/thumbnails/1',
    createdBy: createUserRef(),
    createdAt: '2024-01-01T00:00:00.000Z',
    mimetype: 'image/png',
    size: 2048,
    ...overrides,
  };
}
