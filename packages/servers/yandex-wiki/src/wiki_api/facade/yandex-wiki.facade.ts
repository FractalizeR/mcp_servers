import { injectable, inject } from 'inversify';
import { PageService } from './services/index.js';
import type {
  GetPageParams,
  GetPageByIdParams,
  CreatePageParams,
  UpdatePageParams,
  AppendContentParams,
  DeletePageResult,
} from '#wiki_api/api_operations/index.js';
import type { PageWithUnknownFields, AsyncOperation } from '#wiki_api/entities/index.js';
import type { ClonePageDto } from '#wiki_api/dto/index.js';

/**
 * Фасад для работы с API Yandex Wiki
 *
 * Ответственность:
 * - ТОЛЬКО делегирование вызовов доменным сервисам
 * - НЕТ бизнес-логики
 */
@injectable()
export class YandexWikiFacade {
  constructor(@inject(PageService) private readonly pageService: PageService) {}

  // === Page Methods ===

  /**
   * Получает страницу по slug
   */
  async getPage(params: GetPageParams): Promise<PageWithUnknownFields> {
    return this.pageService.getPage(params);
  }

  /**
   * Получает страницу по ID
   */
  async getPageById(params: GetPageByIdParams): Promise<PageWithUnknownFields> {
    return this.pageService.getPageById(params);
  }

  /**
   * Создает новую страницу
   */
  async createPage(params: CreatePageParams): Promise<PageWithUnknownFields> {
    return this.pageService.createPage(params);
  }

  /**
   * Обновляет страницу
   */
  async updatePage(params: UpdatePageParams): Promise<PageWithUnknownFields> {
    return this.pageService.updatePage(params);
  }

  /**
   * Удаляет страницу
   * @returns recovery_token для восстановления
   */
  async deletePage(idx: number): Promise<DeletePageResult> {
    return this.pageService.deletePage(idx);
  }

  /**
   * Клонирует страницу
   * @returns AsyncOperation с status_url для отслеживания
   */
  async clonePage(idx: number, data: ClonePageDto): Promise<AsyncOperation> {
    return this.pageService.clonePage(idx, data);
  }

  /**
   * Добавляет контент к странице
   */
  async appendContent(params: AppendContentParams): Promise<PageWithUnknownFields> {
    return this.pageService.appendContent(params);
  }
}
