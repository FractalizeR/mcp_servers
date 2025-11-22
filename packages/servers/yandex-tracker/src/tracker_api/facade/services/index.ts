/**
 * Facade Services - Domain-specific services for Yandex Tracker API
 *
 * Архитектура:
 * - Каждый сервис отвечает за один домен (User, Issue, Queue, и т.д.)
 * - Сервисы инжектят операции напрямую (type-safe DI)
 * - Нет зависимостей между сервисами
 * - Facade делегирует вызовы сервисам
 *
 * Принципы:
 * - Single Responsibility Principle (один сервис = один домен)
 * - Dependency Injection (все зависимости через constructor)
 * - Type Safety (compile-time проверка типов)
 */

// Доменные сервисы
export { UserService } from './user.service.js';
// TODO: Будут добавлены экспорты остальных сервисов по мере их создания
// export { IssueService } from './issue.service.js';
// export { IssueLinkService } from './issue-link.service.js';
// export { IssueAttachmentService } from './issue-attachment.service.js';
// export { CommentService } from './comment.service.js';
// export { ChecklistService } from './checklist.service.js';
// export { WorklogService } from './worklog.service.js';
// export { QueueService } from './queue.service.js';
// export { ComponentService } from './component.service.js';
// export { ProjectService } from './project.service.js';
// export { FieldService } from './field.service.js';
// export { BoardService } from './board.service.js';
// export { SprintService } from './sprint.service.js';
// export { BulkChangeService } from './bulk-change.service.js';
