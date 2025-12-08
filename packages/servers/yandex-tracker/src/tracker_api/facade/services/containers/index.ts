/**
 * Containers
 *
 * Экспортирует контейнеры для уменьшения количества
 * параметров конструкторов сервисов и фасадов.
 *
 * Operations Containers - группируют операции для сервисов
 * Services Containers - группируют сервисы для фасада
 */

// Operations Containers (для сервисов)
export { IssueOperationsContainer } from './issue-operations.container.js';
export { QueueOperationsContainer } from './queue-operations.container.js';

// Services Containers (для YandexTrackerFacade)
export { CoreServicesContainer } from './core-services.container.js';
export { IssueServicesContainer } from './issue-services.container.js';
export { QueueServicesContainer } from './queue-services.container.js';
export { ProjectAgileServicesContainer } from './project-agile-services.container.js';
