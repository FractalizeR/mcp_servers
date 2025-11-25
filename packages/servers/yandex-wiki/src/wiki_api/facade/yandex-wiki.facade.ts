import { injectable, inject } from 'inversify';
import { PageService, GridService, ResourceService } from './services/index.js';
import type {
  GetPageParams,
  GetPageByIdParams,
  CreatePageParams,
  UpdatePageParams,
  AppendContentParams,
  DeletePageResult,
  GetGridParams,
  DeleteGridResult,
  GetResourcesParams,
} from '#wiki_api/api_operations/index.js';
import type {
  PageWithUnknownFields,
  GridWithUnknownFields,
  AsyncOperation,
  ResourcesResponse,
} from '#wiki_api/entities/index.js';
import type {
  ClonePageDto,
  CreateGridDto,
  UpdateGridDto,
  AddRowsDto,
  RemoveRowsDto,
  AddColumnsDto,
  RemoveColumnsDto,
  UpdateCellsDto,
  MoveRowDto,
  MoveColumnDto,
  CloneGridDto,
} from '#wiki_api/dto/index.js';

/**
 * Фасад для работы с API Yandex Wiki
 *
 * Ответственность:
 * - ТОЛЬКО делегирование вызовов доменным сервисам
 * - НЕТ бизнес-логики
 */
@injectable()
export class YandexWikiFacade {
  constructor(
    @inject(PageService) private readonly pageService: PageService,
    @inject(GridService) private readonly gridService: GridService,
    @inject(ResourceService) private readonly resourceService: ResourceService
  ) {}

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

  // === Grid Methods ===

  /**
   * Создает динамическую таблицу
   */
  async createGrid(data: CreateGridDto): Promise<GridWithUnknownFields> {
    return this.gridService.createGrid(data);
  }

  /**
   * Получает динамическую таблицу
   */
  async getGrid(params: GetGridParams): Promise<GridWithUnknownFields> {
    return this.gridService.getGrid(params);
  }

  /**
   * Обновляет динамическую таблицу
   */
  async updateGrid(idx: string, data: UpdateGridDto): Promise<GridWithUnknownFields> {
    return this.gridService.updateGrid(idx, data);
  }

  /**
   * Удаляет динамическую таблицу
   * @returns recovery_token для восстановления
   */
  async deleteGrid(idx: string): Promise<DeleteGridResult> {
    return this.gridService.deleteGrid(idx);
  }

  /**
   * Добавляет строки в таблицу
   */
  async addRows(idx: string, data: AddRowsDto): Promise<GridWithUnknownFields> {
    return this.gridService.addRows(idx, data);
  }

  /**
   * Удаляет строки из таблицы
   */
  async removeRows(idx: string, data: RemoveRowsDto): Promise<GridWithUnknownFields> {
    return this.gridService.removeRows(idx, data);
  }

  /**
   * Добавляет колонки в таблицу
   */
  async addColumns(idx: string, data: AddColumnsDto): Promise<GridWithUnknownFields> {
    return this.gridService.addColumns(idx, data);
  }

  /**
   * Удаляет колонки из таблицы
   */
  async removeColumns(idx: string, data: RemoveColumnsDto): Promise<GridWithUnknownFields> {
    return this.gridService.removeColumns(idx, data);
  }

  /**
   * Обновляет ячейки в таблице
   */
  async updateCells(idx: string, data: UpdateCellsDto): Promise<GridWithUnknownFields> {
    return this.gridService.updateCells(idx, data);
  }

  /**
   * Перемещает строки в таблице
   */
  async moveRows(idx: string, data: MoveRowDto): Promise<GridWithUnknownFields> {
    return this.gridService.moveRows(idx, data);
  }

  /**
   * Перемещает колонки в таблице
   */
  async moveColumns(idx: string, data: MoveColumnDto): Promise<GridWithUnknownFields> {
    return this.gridService.moveColumns(idx, data);
  }

  /**
   * Клонирует динамическую таблицу
   * @returns AsyncOperation с status_url для отслеживания
   */
  async cloneGrid(idx: string, data: CloneGridDto): Promise<AsyncOperation> {
    return this.gridService.cloneGrid(idx, data);
  }

  // === Resource Methods ===

  /**
   * Получает ресурсы страницы (вложения, таблицы, SharePoint ресурсы)
   */
  async getResources(params: GetResourcesParams): Promise<ResourcesResponse> {
    return this.resourceService.getResources(params);
  }
}
