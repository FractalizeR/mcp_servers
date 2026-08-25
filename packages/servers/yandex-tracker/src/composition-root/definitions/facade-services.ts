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
  BoardService,
  QueueService,
  IssueAttachmentService,
  BulkChangeService,
  IssueService,
  RawApiService,
  EntityApiService,
  AdministrationService,
  FilterService,
  QueueLocalFieldService,
  BoardColumnService,
} from '#tracker_api/facade/services/index.js';
import {
  IssueOperationsContainer,
  QueueOperationsContainer,
  CoreServicesContainer,
  IssueServicesContainer,
  QueueServicesContainer,
  ProjectAgileServicesContainer,
  EntityAdminServicesContainer,
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

  // Raw API Service
  container.bind(RawApiService).toSelf();

  // Entity API Service (Goal/Project/Portfolio + Key Results) — пакет 7.2.A
  container.bind(EntityApiService).toSelf();

  // Administration Service (справочники) — пакет 7.2.B
  container.bind(AdministrationService).toSelf();

  // Filter Service (сохранённые фильтры) — пакет 7.2.B
  container.bind(FilterService).toSelf();

  // Queue Local Field Service — пакет 7.2.B
  container.bind(QueueLocalFieldService).toSelf();

  // Board Column Service — пакет 7.2.B
  container.bind(BoardColumnService).toSelf();

  // Services Containers (для YandexTrackerFacade - группируют сервисы)
  container.bind(CoreServicesContainer).toSelf();
  container.bind(IssueServicesContainer).toSelf();
  container.bind(QueueServicesContainer).toSelf();
  container.bind(ProjectAgileServicesContainer).toSelf();
  container.bind(EntityAdminServicesContainer).toSelf();
}
