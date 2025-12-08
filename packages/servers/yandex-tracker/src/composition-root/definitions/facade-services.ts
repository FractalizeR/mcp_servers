/**
 * Facade Services DI Definitions
 *
 * Регистрация доменных сервисов Facade в DI контейнере.
 *
 * Архитектура:
 * - Каждый сервис регистрируется как Singleton (defaultScope)
 * - Используем DECORATOR PATTERN: @injectable() + @inject()
 * - Class-based tokens (НЕ Symbols!)
 * - Auto-wiring зависимостей через InversifyJS
 *
 * Почему decorators, а не factory?
 * - Каждый Service имеет РАЗНЫЕ зависимости (3-14 операций)
 * - Декораторы экономят ~90% boilerplate кода
 * - Type-safe auto-wiring
 *
 * Для добавления нового сервиса:
 * 1. Создать сервис с @injectable() декоратором
 * 2. Добавить `container.bind(NewService).toSelf();` здесь
 * 3. Экспортировать из services/index.ts
 *
 * ВАЖНО: НЕ добавлять `.inSingletonScope()` (redundant, defaultScope: 'Singleton')
 */

import type { Container } from 'inversify';
import {
  UserService,
  IssueLinkService,
  ComponentService,
  FieldService,
  CommentService,
  ChecklistService,
  WorklogService,
  SprintService,
  ProjectService,
  BoardService,
  QueueService,
  IssueAttachmentService,
  BulkChangeService,
  IssueService,
} from '#tracker_api/facade/services/index.js';
import {
  IssueOperationsContainer,
  QueueOperationsContainer,
  CoreServicesContainer,
  IssueServicesContainer,
  QueueServicesContainer,
  ProjectAgileServicesContainer,
} from '#tracker_api/facade/services/containers/index.js';

export function bindFacadeServices(container: Container): void {
  // Operations Containers (должны быть зарегистрированы перед сервисами)
  container.bind(IssueOperationsContainer).toSelf();
  container.bind(QueueOperationsContainer).toSelf();

  // Services Containers (должны быть зарегистрированы после сервисов, перед фасадом)
  // Регистрируются позже (после сервисов) - см. ниже

  // User Service
  container.bind(UserService).toSelf();

  // Issue Link Service
  container.bind(IssueLinkService).toSelf();

  // Component Service
  container.bind(ComponentService).toSelf();

  // Field Service
  container.bind(FieldService).toSelf();

  // Comment Service
  container.bind(CommentService).toSelf();

  // Checklist Service
  container.bind(ChecklistService).toSelf();

  // Worklog Service
  container.bind(WorklogService).toSelf();

  // Sprint Service
  container.bind(SprintService).toSelf();

  // Project Service
  container.bind(ProjectService).toSelf();

  // Board Service
  container.bind(BoardService).toSelf();

  // Queue Service
  container.bind(QueueService).toSelf();

  // Issue Attachment Service
  container.bind(IssueAttachmentService).toSelf();

  // Bulk Change Service
  container.bind(BulkChangeService).toSelf();

  // Issue Service
  container.bind(IssueService).toSelf();

  // Services Containers (для YandexTrackerFacade - группируют сервисы)
  container.bind(CoreServicesContainer).toSelf();
  container.bind(IssueServicesContainer).toSelf();
  container.bind(QueueServicesContainer).toSelf();
  container.bind(ProjectAgileServicesContainer).toSelf();
}
