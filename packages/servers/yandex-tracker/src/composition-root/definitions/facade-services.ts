/**
 * Facade Services DI Definitions
 *
 * Регистрация доменных сервисов Facade в DI контейнере.
 *
 * Архитектура:
 * - Каждый сервис регистрируется как Singleton
 * - Используем class-based tokens (как Operations)
 * - Сервисы автоматически получают зависимости через @inject()
 *
 * Для добавления нового сервиса:
 * 1. Создать сервис с @injectable() декоратором
 * 2. Добавить bind() здесь
 * 3. Экспортировать из services/index.ts
 */

import type { Container } from 'inversify';
import {
  UserService,
  IssueLinkService,
  ComponentService,
  FieldService,
  CommentService,
} from '#tracker_api/facade/services/index.js';

export function bindFacadeServices(container: Container): void {
  // User Service
  container.bind(UserService).toSelf().inSingletonScope();

  // Issue Link Service
  container.bind(IssueLinkService).toSelf().inSingletonScope();

  // Component Service
  container.bind(ComponentService).toSelf().inSingletonScope();

  // Field Service
  container.bind(FieldService).toSelf().inSingletonScope();

  // Comment Service
  container.bind(CommentService).toSelf().inSingletonScope();

  // TODO: Будут добавлены остальные сервисы по мере создания:
  // container.bind(IssueService).toSelf().inSingletonScope();
  // container.bind(IssueAttachmentService).toSelf().inSingletonScope();
  // container.bind(ChecklistService).toSelf().inSingletonScope();
  // container.bind(WorklogService).toSelf().inSingletonScope();
  // container.bind(QueueService).toSelf().inSingletonScope();
  // container.bind(ProjectService).toSelf().inSingletonScope();
  // container.bind(BoardService).toSelf().inSingletonScope();
  // container.bind(SprintService).toSelf().inSingletonScope();
  // container.bind(BulkChangeService).toSelf().inSingletonScope();
}
