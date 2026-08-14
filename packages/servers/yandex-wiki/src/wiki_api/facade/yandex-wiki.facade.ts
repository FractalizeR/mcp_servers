import { injectable, inject } from 'inversify';
import type { RawApiCapable, RawApiRequestInput } from '@fractalizer/mcp-core';
import {
  PageService,
  GridService,
  ResourceService,
  RawApiService,
  SearchService,
  CommentService,
  PageAccessService,
  AttachmentService,
} from './services/index.js';
import type {
  GetPageParams,
  GetPageByIdParams,
  CreatePageParams,
  UpdatePageParams,
  AppendContentParams,
  DeletePageParams,
  DeletePageResult,
  GetGridParams,
  DeleteGridResult,
  GetResourcesParams,
  GetDescendantsByIdParams,
  GetDescendantsBySlugParams,
  GetCommentsParams,
  GetCommentThreadParams,
  UpdatePageAccessParams,
  DeletePageAccessParams,
  DeleteAllPageAccessesParams,
  UploadAttachmentParams,
} from '#wiki_api/api_operations/index.js';
import type {
  PageWithUnknownFields,
  GridWithUnknownFields,
  AsyncOperation,
  ResourcesResponse,
  PageDescendantsResponse,
  SearchResponse,
  Comment,
  CommentsResponse,
  DeleteCommentResult,
  PageAccess,
  Attachment,
  DownloadedFile,
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
  SearchDto,
  CreateCommentDto,
  CreatePageAccessDto,
} from '#wiki_api/dto/index.js';

/**
 * Фасад для работы с API Yandex Wiki
 *
 * Ответственность:
 * - ТОЛЬКО делегирование вызовов доменным сервисам
 * - НЕТ бизнес-логики
 */
@injectable()
export class YandexWikiFacade implements RawApiCapable {
  constructor(
    @inject(PageService) private readonly pageService: PageService,
    @inject(GridService) private readonly gridService: GridService,
    @inject(ResourceService) private readonly resourceService: ResourceService,
    @inject(RawApiService) private readonly rawApiService: RawApiService,
    @inject(SearchService) private readonly searchService: SearchService,
    @inject(CommentService) private readonly commentService: CommentService,
    @inject(PageAccessService) private readonly pageAccessService: PageAccessService,
    @inject(AttachmentService) private readonly attachmentService: AttachmentService
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
  async deletePage(params: DeletePageParams): Promise<DeletePageResult> {
    return this.pageService.deletePage(params);
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

  /**
   * Обходит поддерево раздела по ID родительской страницы (пакет 7.2.C).
   */
  async getDescendantsById(params: GetDescendantsByIdParams): Promise<PageDescendantsResponse> {
    return this.pageService.getDescendantsById(params);
  }

  /**
   * Обходит поддерево раздела по slug родительской страницы (пакет 7.2.C).
   */
  async getDescendantsBySlug(params: GetDescendantsBySlugParams): Promise<PageDescendantsResponse> {
    return this.pageService.getDescendantsBySlug(params);
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

  // === Search Methods ===

  /**
   * Полнотекстовый поиск по страницам/файлам Wiki (пакет 7.2.C).
   */
  async search(data: SearchDto): Promise<SearchResponse> {
    return this.searchService.search(data);
  }

  // === Comment Methods ===

  /**
   * Список комментариев страницы (пакет 7.2.D).
   */
  async getComments(params: GetCommentsParams): Promise<CommentsResponse> {
    return this.commentService.getComments(params);
  }

  /**
   * Создаёт комментарий (или ответ в треде — при `parent_id`/`thread_id`).
   */
  async createComment(idx: number, data: CreateCommentDto): Promise<Comment> {
    return this.commentService.createComment(idx, data);
  }

  /**
   * Комментарии треда (ответы на конкретный комментарий).
   */
  async getCommentThread(params: GetCommentThreadParams): Promise<CommentsResponse> {
    return this.commentService.getCommentThread(params);
  }

  /**
   * Удаляет комментарий.
   * @returns comments_count — актуальное число комментариев на странице
   */
  async deleteComment(idx: number, commentId: number): Promise<DeleteCommentResult> {
    return this.commentService.deleteComment(idx, commentId);
  }

  // === Page Access Methods ===

  /**
   * Добавляет пользователю или группе доступ к странице (пакет 7.2.D).
   */
  async createPageAccess(idx: number, data: CreatePageAccessDto): Promise<PageAccess> {
    return this.pageAccessService.createPageAccess(idx, data);
  }

  /**
   * Меняет роль/наследование существующего доступа.
   */
  async updatePageAccess(params: UpdatePageAccessParams): Promise<PageAccess> {
    return this.pageAccessService.updatePageAccess(params);
  }

  /**
   * Удаляет один доступ по его id.
   */
  async deletePageAccess(params: DeletePageAccessParams): Promise<void> {
    return this.pageAccessService.deletePageAccess(params);
  }

  /**
   * Удаляет ВСЕ персональные доступы страницы (не групповые/наследуемые).
   */
  async deleteAllPageAccesses(params: DeleteAllPageAccessesParams): Promise<void> {
    return this.pageAccessService.deleteAllPageAccesses(params);
  }

  // === Attachment Methods ===

  /**
   * Загружает файл и прикрепляет его к странице (пакет 7.2.D) — см.
   * заголовок `upload-attachment.operation.ts` про внутренний Upload Session
   * протокол, скрытый за одним вызовом.
   */
  async uploadAttachment(params: UploadAttachmentParams): Promise<Attachment> {
    return this.attachmentService.uploadAttachment(params);
  }

  /**
   * Скачивает содержимое вложения страницы.
   */
  async downloadAttachment(idx: number, fileId: number): Promise<DownloadedFile> {
    return this.attachmentService.downloadAttachment(idx, fileId);
  }

  // === Raw API (escape hatch) ===

  /**
   * Выполняет прямой (raw) запрос к API Яндекс.Вики.
   *
   * Реализация контракта RawApiCapable из @fractalizer/mcp-core.
   *
   * @param input - метод, путь и query-параметры
   * @returns необработанный ответ API
   */
  async rawApiRequest(input: RawApiRequestInput): Promise<unknown> {
    return this.rawApiService.request(input);
  }
}
