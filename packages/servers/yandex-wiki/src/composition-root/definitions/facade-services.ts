import type { Container } from 'inversify';
import { PageService } from '#wiki_api/facade/services/index.js';

/**
 * Регистрация доменных сервисов для Yandex Wiki
 */
export function bindFacadeServices(container: Container): void {
  container.bind(PageService).toSelf().inSingletonScope();
}
