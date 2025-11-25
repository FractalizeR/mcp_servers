import type { Container } from 'inversify';
import { PageService, GridService, ResourceService } from '#wiki_api/facade/services/index.js';

/**
 * Регистрация доменных сервисов для Yandex Wiki
 */
export function bindFacadeServices(container: Container): void {
  container.bind(PageService).toSelf().inSingletonScope();
  container.bind(GridService).toSelf().inSingletonScope();
  container.bind(ResourceService).toSelf().inSingletonScope();
}
