import type { Container } from 'inversify';
import {
  PageService,
  GridService,
  ResourceService,
  GridCrudOperationsContainer,
  GridDataOperationsContainer,
  PageOperationsContainer,
} from '#wiki_api/facade/services/index.js';

/**
 * Регистрация доменных сервисов для Yandex Wiki
 */
export function bindFacadeServices(container: Container): void {
  // Operations Containers (must be bound before services)
  container.bind(GridCrudOperationsContainer).toSelf().inSingletonScope();
  container.bind(GridDataOperationsContainer).toSelf().inSingletonScope();
  container.bind(PageOperationsContainer).toSelf().inSingletonScope();

  // Services
  container.bind(PageService).toSelf().inSingletonScope();
  container.bind(GridService).toSelf().inSingletonScope();
  container.bind(ResourceService).toSelf().inSingletonScope();
}
