/**
 * Фасад для работы с API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - ТОЛЬКО делегирование вызовов доменным сервисам
 * - НЕТ бизнес-логики (всё в сервисах)
 * - НЕТ ручной инициализации (извлекается из DI контейнера)
 *
 * Архитектура:
 * - Facade делегирует вызовы 4 сервисным контейнерам
 * - Каждый контейнер группирует связанные сервисы по доменам:
 *   - CoreServicesContainer: UserService, FieldService
 *   - IssueServicesContainer: IssueService, IssueLinkService, IssueAttachmentService,
 *                             CommentService, ChecklistService, WorklogService
 *   - QueueServicesContainer: QueueService, ComponentService
 *   - ProjectAgileServicesContainer: ProjectService, BoardService, SprintService, BulkChangeService
 * - Нет зависимости от Container (прямая инъекция)
 *
 * Паттерн: Facade Pattern + Parameter Object + Dependency Injection
 */

import { injectable, inject } from 'inversify';
import {
  CoreServicesContainer,
  IssueServicesContainer,
  QueueServicesContainer,
  ProjectAgileServicesContainer,
} from './services/containers/index.js';

// Types
import type { PingResult } from '#tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import type { BatchIssueLinksResult } from '#tracker_api/api_operations/link/get-issue-links.operation.js';
import type { BatchChangelogResult } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';
import type { FindIssuesResult } from '#tracker_api/api_operations/issue/find/index.js';
import type {
  FindIssuesInputDto,
  CreateIssueDto,
  UpdateIssueDto,
  ExecuteTransitionDto,
  GetQueuesDto,
  GetQueueDto,
  CreateQueueDto,
  GetQueueFieldsDto,
  QueueOutput,
  QueuesListOutput,
  QueueFieldsOutput,
  QueuePermissionsOutput,
  ComponentOutput,
  ComponentsListOutput,
  CreateLinkDto,
  AddCommentInput,
  EditCommentInput,
  GetCommentsInput,
  AddWorklogInput,
  UpdateWorklogInput,
  UploadAttachmentInput,
  DownloadAttachmentInput,
  DownloadAttachmentOutput,
  AddChecklistItemInput,
  UpdateChecklistItemInput,
  GetProjectsDto,
  CreateProjectDto,
  ProjectOutput,
  ProjectsListOutput,
  BulkUpdateIssuesInputDto,
  BulkTransitionIssuesInputDto,
  BulkMoveIssuesInputDto,
  CreateFieldDto,
  UpdateFieldDto,
  FieldOutput,
  FieldsListOutput,
  GetBoardsDto,
  GetBoardDto,
  CreateBoardDto,
  UpdateBoardDto,
  BoardOutput,
  BoardsListOutput,
  CreateSprintDto,
  UpdateSprintDto,
  SprintOutput,
  SprintsListOutput,
} from '#tracker_api/dto/index.js';
import type {
  IssueWithUnknownFields,
  TransitionWithUnknownFields,
  LinkWithUnknownFields,
  LinkRelationship,
  CommentWithUnknownFields,
  WorklogWithUnknownFields,
  AttachmentWithUnknownFields,
  ChecklistItemWithUnknownFields,
  BulkChangeOperationWithUnknownFields,
} from '#tracker_api/entities/index.js';
import type {
  UpdateQueueParams,
  ManageQueueAccessParams,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
} from '#tracker_api/api_operations/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';

@injectable()
export class YandexTrackerFacade {
  constructor(
    @inject(CoreServicesContainer) private readonly core: CoreServicesContainer,
    @inject(IssueServicesContainer) private readonly issues: IssueServicesContainer,
    @inject(QueueServicesContainer) private readonly queues: QueueServicesContainer,
    @inject(ProjectAgileServicesContainer)
    private readonly projectAgile: ProjectAgileServicesContainer
  ) {}

  // === User Methods ===

  /**
   * Проверяет подключение к API Яндекс.Трекера
   * @returns результат проверки
   */
  async ping(): Promise<PingResult> {
    return this.core.user.ping();
  }

  // === Issue Methods - Batch ===

  /**
   * Получает несколько задач параллельно
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssues(issueKeys: string[]): Promise<BatchIssueResult[]> {
    return this.issues.issue.getIssues(issueKeys);
  }

  // === Issue Methods - Search ===

  /**
   * Ищет задачи по заданным критериям
   * @param params - параметры поиска (query/filter/keys/queue)
   * @returns массив найденных задач
   */
  async findIssues(params: FindIssuesInputDto): Promise<FindIssuesResult> {
    return this.issues.issue.findIssues(params);
  }

  // === Issue Methods - Create/Update ===

  /**
   * Создаёт новую задачу
   * @param issueData - данные задачи
   * @returns созданная задача
   */
  async createIssue(issueData: CreateIssueDto): Promise<IssueWithUnknownFields> {
    return this.issues.issue.createIssue(issueData);
  }

  /**
   * Обновляет существующую задачу
   * @param issueKey - ключ задачи
   * @param updateData - данные для обновления
   * @returns обновлённая задача
   */
  async updateIssue(issueKey: string, updateData: UpdateIssueDto): Promise<IssueWithUnknownFields> {
    return this.issues.issue.updateIssue(issueKey, updateData);
  }

  // === Issue Methods - Changelog ===

  /**
   * Получает историю изменений задач (batch-режим)
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssueChangelog(issueKeys: string[]): Promise<BatchChangelogResult[]> {
    return this.issues.issue.getIssueChangelog(issueKeys);
  }

  // === Issue Methods - Transitions ===

  /**
   * Получает доступные переходы статусов для задачи
   * @param issueKey - ключ задачи
   * @returns массив доступных переходов
   */
  async getIssueTransitions(issueKey: string): Promise<TransitionWithUnknownFields[]> {
    return this.issues.issue.getIssueTransitions(issueKey);
  }

  /**
   * Выполняет переход задачи в другой статус
   * @param issueKey - ключ задачи
   * @param transitionId - идентификатор перехода
   * @param transitionData - дополнительные данные (опционально)
   * @returns обновлённая задача
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    transitionData?: ExecuteTransitionDto
  ): Promise<IssueWithUnknownFields> {
    return this.issues.issue.transitionIssue(issueKey, transitionId, transitionData);
  }

  // === Queue Methods ===

  /**
   * Получает список очередей с пагинацией
   * @param params - параметры запроса (perPage, page, expand)
   * @returns массив очередей
   */
  async getQueues(params?: GetQueuesDto): Promise<QueuesListOutput> {
    return this.queues.queue.getQueues(params);
  }

  /**
   * Получает одну очередь по ID или ключу
   * @param params - параметры запроса (queueId, expand)
   * @returns очередь с полными данными
   */
  async getQueue(params: GetQueueDto): Promise<QueueOutput> {
    return this.queues.queue.getQueue(params);
  }

  /**
   * Создаёт новую очередь
   * @param queueData - данные очереди
   * @returns созданная очередь
   */
  async createQueue(queueData: CreateQueueDto): Promise<QueueOutput> {
    return this.queues.queue.createQueue(queueData);
  }

  /**
   * Обновляет существующую очередь
   * @param params - параметры (queueId и updates)
   * @returns обновлённая очередь
   */
  async updateQueue(params: UpdateQueueParams): Promise<QueueOutput> {
    return this.queues.queue.updateQueue(params);
  }

  /**
   * Получает список обязательных полей очереди
   * @param params - параметры запроса (queueId)
   * @returns массив полей очереди
   */
  async getQueueFields(params: GetQueueFieldsDto): Promise<QueueFieldsOutput> {
    return this.queues.queue.getQueueFields(params);
  }

  /**
   * Управляет правами доступа к очереди
   * @param params - параметры (queueId и accessData)
   * @returns массив прав доступа
   */
  async manageQueueAccess(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
    return this.queues.queue.manageQueueAccess(params);
  }

  // === Project Methods ===

  /**
   * Получает список проектов
   * @param params - параметры запроса (опционально)
   * @returns список проектов
   */
  async getProjects(params?: GetProjectsDto): Promise<ProjectsListOutput> {
    return this.projectAgile.project.getProjects(params);
  }

  /**
   * Получает один проект по ID
   * @param params - параметры запроса (projectId, expand)
   * @returns проект
   */
  async getProject(params: GetProjectParams): Promise<ProjectOutput> {
    return this.projectAgile.project.getProject(params);
  }

  /**
   * Создаёт новый проект
   * @param data - данные проекта
   * @returns созданный проект
   */
  async createProject(data: CreateProjectDto): Promise<ProjectOutput> {
    return this.projectAgile.project.createProject(data);
  }

  /**
   * Обновляет проект
   * @param params - параметры обновления (projectId, data)
   * @returns обновлённый проект
   */
  async updateProject(params: UpdateProjectParams): Promise<ProjectOutput> {
    return this.projectAgile.project.updateProject(params);
  }

  /**
   * Удаляет проект
   * @param params - параметры удаления (projectId)
   * @returns void
   */
  async deleteProject(params: DeleteProjectParams): Promise<void> {
    return this.projectAgile.project.deleteProject(params);
  }

  // === Component Methods ===

  /**
   * Получает список компонентов очереди
   * @param queueId - ключ или ID очереди
   * @returns массив компонентов очереди
   */
  async getComponents(params: { queueId: string }): Promise<ComponentsListOutput> {
    return this.queues.component.getComponents(params);
  }

  /**
   * Создаёт новый компонент в очереди
   * @param queueId - ключ или ID очереди
   * @param componentData - данные компонента
   * @returns созданный компонент
   */
  async createComponent(params: {
    queueId: string;
    name: string;
    description?: string | undefined;
    lead?: string | undefined;
    assignAuto?: boolean | undefined;
  }): Promise<ComponentOutput> {
    return this.queues.component.createComponent(params);
  }

  /**
   * Обновляет существующий компонент
   * @param componentId - ID компонента
   * @param componentData - данные для обновления
   * @returns обновлённый компонент
   */
  async updateComponent(params: {
    componentId: string;
    name?: string | undefined;
    description?: string | undefined;
    lead?: string | undefined;
    assignAuto?: boolean | undefined;
  }): Promise<ComponentOutput> {
    return this.queues.component.updateComponent(params);
  }

  /**
   * Удаляет компонент из очереди
   * @param componentId - ID компонента
   */
  async deleteComponent(params: { componentId: string }): Promise<void> {
    return this.queues.component.deleteComponent(params);
  }

  // === Issue Methods - Links ===

  /**
   * Получает связи для нескольких задач параллельно
   * @param issueIds - массив ключей или ID задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssueLinks(issueIds: string[]): Promise<BatchIssueLinksResult[]> {
    return this.issues.link.getIssueLinks(issueIds);
  }

  /**
   * Создаёт связь между текущей и указанной задачей
   * @param issueId - ключ или ID текущей задачи
   * @param linkData - параметры связи (relationship и issue)
   * @returns созданная связь
   */
  async createLink(issueId: string, linkData: CreateLinkDto): Promise<LinkWithUnknownFields> {
    return this.issues.link.createLink(issueId, linkData);
  }

  /**
   * Создаёт связи для нескольких задач параллельно
   * @param links - массив связей с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async createLinksMany(
    links: Array<{ issueId: string; relationship: LinkRelationship; targetIssue: string }>
  ): Promise<BatchResult<string, LinkWithUnknownFields>> {
    return this.issues.link.createLinksMany(links);
  }

  /**
   * Удаляет связь между задачами
   * @param issueId - ключ или ID задачи
   * @param linkId - ID связи для удаления
   */
  async deleteLink(issueId: string, linkId: string): Promise<void> {
    return this.issues.link.deleteLink(issueId, linkId);
  }

  /**
   * Удаляет связи из нескольких задач параллельно
   * @param links - массив связей для удаления с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async deleteLinksMany(
    links: Array<{ issueId: string; linkId: string }>
  ): Promise<BatchResult<string, void>> {
    return this.issues.link.deleteLinksMany(links);
  }

  // === Comment Methods ===

  /**
   * Добавляет комментарий к задаче
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные комментария
   * @returns созданный комментарий
   */
  async addComment(issueId: string, input: AddCommentInput): Promise<CommentWithUnknownFields> {
    return this.issues.comment.addComment(issueId, input);
  }

  /**
   * Добавляет комментарии к нескольким задачам параллельно
   * @param comments - массив комментариев с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async addCommentsMany(
    comments: Array<{ issueId: string; text: string; attachmentIds?: string[] | undefined }>
  ): Promise<BatchResult<string, CommentWithUnknownFields>> {
    return this.issues.comment.addCommentsMany(comments);
  }

  /**
   * Получает список комментариев задачи
   * @param issueId - идентификатор или ключ задачи
   * @param input - параметры запроса (пагинация, expand)
   * @returns массив комментариев
   */
  async getComments(
    issueId: string,
    input?: GetCommentsInput
  ): Promise<CommentWithUnknownFields[]> {
    return this.issues.comment.getComments(issueId, input);
  }

  /**
   * Получает комментарии для нескольких задач параллельно
   * @param issueIds - массив идентификаторов задач
   * @param input - параметры запроса (применяются ко всем задачам)
   * @returns массив результатов в формате BatchResult
   */
  async getCommentsMany(
    issueIds: string[],
    input?: GetCommentsInput
  ): Promise<BatchResult<string, CommentWithUnknownFields[]>> {
    return this.issues.comment.getCommentsMany(issueIds, input);
  }

  /**
   * Редактирует комментарий
   * @param issueId - идентификатор или ключ задачи
   * @param commentId - идентификатор комментария
   * @param input - новые данные комментария
   * @returns обновлённый комментарий
   */
  async editComment(
    issueId: string,
    commentId: string,
    input: EditCommentInput
  ): Promise<CommentWithUnknownFields> {
    return this.issues.comment.editComment(issueId, commentId, input);
  }

  /**
   * Редактирует несколько комментариев параллельно
   * @param comments - массив комментариев для редактирования с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async editCommentsMany(
    comments: Array<{ issueId: string; commentId: string; text: string }>
  ): Promise<BatchResult<string, CommentWithUnknownFields>> {
    return this.issues.comment.editCommentsMany(comments);
  }

  /**
   * Удаляет комментарий
   * @param issueId - идентификатор или ключ задачи
   * @param commentId - идентификатор комментария
   * @returns void
   */
  async deleteComment(issueId: string, commentId: string): Promise<void> {
    return this.issues.comment.deleteComment(issueId, commentId);
  }

  /**
   * Удаляет комментарии из нескольких задач параллельно
   * @param comments - массив комментариев для удаления с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async deleteCommentsMany(
    comments: Array<{ issueId: string; commentId: string }>
  ): Promise<BatchResult<string, void>> {
    return this.issues.comment.deleteCommentsMany(comments);
  }

  // === Checklist Methods ===

  /**
   * Получает чеклист задачи
   * @param issueId - идентификатор или ключ задачи
   * @returns массив элементов чеклиста
   */
  async getChecklist(issueId: string): Promise<ChecklistItemWithUnknownFields[]> {
    return this.issues.checklist.getChecklist(issueId);
  }

  /**
   * Получает чеклисты для нескольких задач параллельно
   * @param issueIds - массив ключей или ID задач
   * @returns результаты в формате BatchResult
   */
  async getChecklistMany(
    issueIds: string[]
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields[]>> {
    return this.issues.checklist.getChecklistMany(issueIds);
  }

  /**
   * Добавляет элемент в чеклист задачи
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные элемента
   * @returns созданный элемент чеклиста
   */
  async addChecklistItem(
    issueId: string,
    input: AddChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    return this.issues.checklist.addChecklistItem(issueId, input);
  }

  /**
   * Добавляет элементы в чеклисты нескольких задач параллельно
   * @param items - массив элементов с индивидуальными параметрами
   * @returns результаты batch-операции
   */
  async addChecklistItemMany(
    items: Array<{
      issueId: string;
      text: string;
      checked?: boolean | undefined;
      assignee?: string | undefined;
      deadline?: string | undefined;
    }>
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields>> {
    return this.issues.checklist.addChecklistItemMany(items);
  }

  /**
   * Обновляет элемент чеклиста
   * @param issueId - идентификатор или ключ задачи
   * @param checklistItemId - идентификатор элемента чеклиста
   * @param input - новые данные элемента
   * @returns обновлённый элемент чеклиста
   */
  async updateChecklistItem(
    issueId: string,
    checklistItemId: string,
    input: UpdateChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    return this.issues.checklist.updateChecklistItem(issueId, checklistItemId, input);
  }

  /**
   * Обновляет элементы чеклистов нескольких задач параллельно
   * @param items - массив элементов с индивидуальными параметрами
   * @returns результаты batch-операции
   */
  async updateChecklistItemMany(
    items: Array<{
      issueId: string;
      checklistItemId: string;
      text?: string | undefined;
      checked?: boolean | undefined;
      assignee?: string | undefined;
      deadline?: string | undefined;
    }>
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields>> {
    return this.issues.checklist.updateChecklistItemMany(items);
  }

  /**
   * Удаляет элемент из чеклиста
   * @param issueId - идентификатор или ключ задачи
   * @param checklistItemId - идентификатор элемента чеклиста
   * @returns void
   */
  async deleteChecklistItem(issueId: string, checklistItemId: string): Promise<void> {
    return this.issues.checklist.deleteChecklistItem(issueId, checklistItemId);
  }

  /**
   * Удаляет элементы из чеклистов нескольких задач параллельно
   * @param items - массив элементов для удаления с индивидуальными параметрами
   * @returns результаты batch-операции
   */
  async deleteChecklistItemMany(
    items: Array<{ issueId: string; itemId: string }>
  ): Promise<BatchResult<string, void>> {
    return this.issues.checklist.deleteChecklistItemMany(items);
  }

  // === Worklog Methods ===

  /**
   * Получает список записей времени задачи
   * @param issueId - идентификатор или ключ задачи
   * @returns массив записей времени
   */
  async getWorklogs(issueId: string): Promise<WorklogWithUnknownFields[]> {
    return this.issues.worklog.getWorklogs(issueId);
  }

  /**
   * Получает записи времени для нескольких задач параллельно
   * @param issueIds - массив идентификаторов задач
   * @returns результаты в формате BatchResult
   */
  async getWorklogsMany(
    issueIds: string[]
  ): Promise<BatchResult<string, WorklogWithUnknownFields[]>> {
    return this.issues.worklog.getWorklogsMany(issueIds);
  }

  /**
   * Добавляет запись времени к задаче
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные записи времени
   * @returns созданная запись времени
   */
  async addWorklog(issueId: string, input: AddWorklogInput): Promise<WorklogWithUnknownFields> {
    return this.issues.worklog.addWorklog(issueId, input);
  }

  /**
   * Добавляет записи времени к нескольким задачам параллельно
   * @param worklogs - массив записей времени с индивидуальными параметрами
   * @returns результаты в формате BatchResult
   */
  async addWorklogsMany(
    worklogs: Array<{
      issueId: string;
      start: string;
      duration: string;
      comment?: string | undefined;
    }>
  ): Promise<BatchResult<string, WorklogWithUnknownFields>> {
    return this.issues.worklog.addWorklogsMany(worklogs);
  }

  /**
   * Обновляет запись времени
   * @param issueId - идентификатор или ключ задачи
   * @param worklogId - идентификатор записи времени
   * @param input - новые данные записи времени
   * @returns обновлённая запись времени
   */
  async updateWorklog(
    issueId: string,
    worklogId: string,
    input: UpdateWorklogInput
  ): Promise<WorklogWithUnknownFields> {
    return this.issues.worklog.updateWorklog(issueId, worklogId, input);
  }

  /**
   * Удаляет запись времени
   * @param issueId - идентификатор или ключ задачи
   * @param worklogId - идентификатор записи времени
   * @returns void
   */
  async deleteWorklog(issueId: string, worklogId: string): Promise<void> {
    return this.issues.worklog.deleteWorklog(issueId, worklogId);
  }

  // === Issue Methods - Attachments ===

  /**
   * Получает список всех прикрепленных файлов задачи
   * @param issueId - ключ или ID задачи
   * @returns массив прикрепленных файлов
   */
  async getAttachments(issueId: string): Promise<AttachmentWithUnknownFields[]> {
    return this.issues.attachment.getAttachments(issueId);
  }

  /**
   * Получает списки прикрепленных файлов для нескольких задач параллельно
   * @param issueIds - массив ключей или ID задач
   * @returns результаты в формате BatchResult
   */
  async getAttachmentsMany(
    issueIds: string[]
  ): Promise<BatchResult<string, AttachmentWithUnknownFields[]>> {
    return this.issues.attachment.getAttachmentsMany(issueIds);
  }

  /**
   * Загружает файл в задачу
   * @param issueId - ключ или ID задачи
   * @param input - параметры загрузки файла (filename, file, mimetype)
   * @returns информация о загруженном файле
   */
  async uploadAttachment(
    issueId: string,
    input: UploadAttachmentInput
  ): Promise<AttachmentWithUnknownFields> {
    return this.issues.attachment.uploadAttachment(issueId, input);
  }

  /**
   * Скачивает прикрепленный файл из задачи
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла
   * @param filename - имя файла
   * @param input - опции скачивания (saveToPath, returnBase64)
   * @returns содержимое файла и метаданные
   */
  async downloadAttachment(
    issueId: string,
    attachmentId: string,
    filename: string,
    input?: DownloadAttachmentInput
  ): Promise<DownloadAttachmentOutput> {
    return this.issues.attachment.downloadAttachment(issueId, attachmentId, filename, input);
  }

  /**
   * Удаляет прикрепленный файл из задачи
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла
   */
  async deleteAttachment(issueId: string, attachmentId: string): Promise<void> {
    return this.issues.attachment.deleteAttachment(issueId, attachmentId);
  }

  /**
   * Получает миниатюру прикрепленного изображения
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла (должно быть изображение)
   * @param input - опции скачивания (saveToPath, returnBase64)
   * @returns содержимое миниатюры и метаданные
   */
  async getThumbnail(
    issueId: string,
    attachmentId: string,
    input?: DownloadAttachmentInput
  ): Promise<DownloadAttachmentOutput> {
    return this.issues.attachment.getThumbnail(issueId, attachmentId, input);
  }

  // === Bulk Change Methods ===

  /**
   * Выполняет массовое обновление задач
   *
   * ВАЖНО: Операция выполняется асинхронно на сервере.
   * Метод возвращает информацию об операции (включая operationId).
   * Для проверки статуса используй getBulkChangeStatus(operationId).
   *
   * @param params - параметры массового обновления (issues + values)
   * @returns информация о запущенной операции
   *
   * @example
   * ```typescript
   * const operation = await facade.bulkUpdateIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'],
   *   values: {
   *     priority: 'minor',
   *     tags: { add: ['bug'] }
   *   }
   * });
   * // Проверить статус позже
   * const status = await facade.getBulkChangeStatus(operation.id);
   * ```
   */
  async bulkUpdateIssues(
    params: BulkUpdateIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    return this.projectAgile.bulkChange.bulkUpdateIssues(params);
  }

  /**
   * Выполняет массовую смену статусов задач
   *
   * ВАЖНО: Операция выполняется асинхронно на сервере.
   * Метод возвращает информацию об операции (включая operationId).
   * Для проверки статуса используй getBulkChangeStatus(operationId).
   *
   * @param params - параметры массового перехода (issues + transition + values)
   * @returns информация о запущенной операции
   *
   * @example
   * ```typescript
   * // Простой переход
   * const operation = await facade.bulkTransitionIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2'],
   *   transition: 'start_progress'
   * });
   *
   * // С установкой resolution
   * const operation = await facade.bulkTransitionIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2'],
   *   transition: 'close',
   *   values: { resolution: 'fixed' }
   * });
   * ```
   */
  async bulkTransitionIssues(
    params: BulkTransitionIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    return this.projectAgile.bulkChange.bulkTransitionIssues(params);
  }

  /**
   * Выполняет массовое перемещение задач между очередями
   *
   * ВАЖНО: Операция выполняется асинхронно на сервере.
   * Метод возвращает информацию об операции (включая operationId).
   * Для проверки статуса используй getBulkChangeStatus(operationId).
   *
   * @param params - параметры массового перемещения (issues + queue + values)
   * @returns информация о запущенной операции
   *
   * @example
   * ```typescript
   * // Простое перемещение
   * const operation = await facade.bulkMoveIssues({
   *   issues: ['QUEUE1-1', 'QUEUE1-2'],
   *   queue: 'QUEUE2'
   * });
   *
   * // С сохранением всех полей
   * const operation = await facade.bulkMoveIssues({
   *   issues: ['QUEUE1-1', 'QUEUE1-2'],
   *   queue: 'QUEUE2',
   *   moveAllFields: true
   * });
   * ```
   */
  async bulkMoveIssues(
    params: BulkMoveIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    return this.projectAgile.bulkChange.bulkMoveIssues(params);
  }

  /**
   * Получает текущий статус bulk операции
   *
   * Используется для мониторинга прогресса асинхронных операций
   * (bulkUpdateIssues, bulkTransitionIssues, bulkMoveIssues).
   *
   * @param operationId - идентификатор операции (из response.id при создании)
   * @returns актуальная информация о статусе операции
   *
   * @example
   * ```typescript
   * const status = await facade.getBulkChangeStatus('12345');
   * console.log(`Статус: ${status.status}, прогресс: ${status.progress}%`);
   * console.log(`Обработано: ${status.processedIssues}/${status.totalIssues}`);
   *
   * // Polling с ожиданием завершения
   * async function waitForCompletion(operationId: string) {
   *   while (true) {
   *     const status = await facade.getBulkChangeStatus(operationId);
   *     if (status.status === 'COMPLETED' || status.status === 'FAILED') {
   *       return status;
   *     }
   *     await new Promise(resolve => setTimeout(resolve, 2000));
   *   }
   * }
   * ```
   */
  async getBulkChangeStatus(operationId: string): Promise<BulkChangeOperationWithUnknownFields> {
    return this.projectAgile.bulkChange.getBulkChangeStatus(operationId);
  }

  // === Field Methods ===

  /**
   * Получает список всех полей трекера
   * @returns массив всех полей (системных и кастомных)
   */
  async getFields(): Promise<FieldsListOutput> {
    return this.core.field.getFields();
  }

  /**
   * Получает поле по ID
   * @param fieldId - идентификатор поля
   * @returns данные поля
   */
  async getField(fieldId: string): Promise<FieldOutput> {
    return this.core.field.getField(fieldId);
  }

  /**
   * Создает кастомное поле
   * @param input - данные для создания поля
   * @returns созданное поле
   */
  async createField(input: CreateFieldDto): Promise<FieldOutput> {
    return this.core.field.createField(input);
  }

  /**
   * Обновляет поле
   * @param fieldId - идентификатор поля
   * @param input - данные для обновления
   * @returns обновленное поле
   */
  async updateField(fieldId: string, input: UpdateFieldDto): Promise<FieldOutput> {
    return this.core.field.updateField(fieldId, input);
  }

  /**
   * Удаляет поле
   * @param fieldId - идентификатор поля
   */
  async deleteField(fieldId: string): Promise<void> {
    return this.core.field.deleteField(fieldId);
  }

  // === Board Methods ===

  /**
   * Получает список всех досок
   * @param params - параметры запроса (опционально)
   * @returns массив досок
   */
  async getBoards(params?: GetBoardsDto): Promise<BoardsListOutput> {
    return this.projectAgile.board.getBoards(params);
  }

  /**
   * Получает доску по ID
   * @param boardId - идентификатор доски
   * @param params - дополнительные параметры (localized)
   * @returns данные доски
   */
  async getBoard(boardId: string, params?: Omit<GetBoardDto, 'boardId'>): Promise<BoardOutput> {
    return this.projectAgile.board.getBoard(boardId, params);
  }

  /**
   * Создает новую доску
   * @param input - данные для создания доски
   * @returns созданная доска
   */
  async createBoard(input: CreateBoardDto): Promise<BoardOutput> {
    return this.projectAgile.board.createBoard(input);
  }

  /**
   * Обновляет доску
   * @param boardId - идентификатор доски
   * @param input - данные для обновления
   * @returns обновленная доска
   */
  async updateBoard(boardId: string, input: Omit<UpdateBoardDto, 'boardId'>): Promise<BoardOutput> {
    return this.projectAgile.board.updateBoard(boardId, input);
  }

  /**
   * Удаляет доску
   * @param boardId - идентификатор доски
   */
  async deleteBoard(boardId: string): Promise<void> {
    return this.projectAgile.board.deleteBoard(boardId);
  }

  // === Sprint Methods ===

  /**
   * Получает список спринтов доски
   * @param boardId - идентификатор доски
   * @returns массив спринтов
   */
  async getSprints(boardId: string): Promise<SprintsListOutput> {
    return this.projectAgile.sprint.getSprints(boardId);
  }

  /**
   * Получает спринт по ID
   * @param sprintId - идентификатор спринта
   * @returns данные спринта
   */
  async getSprint(sprintId: string): Promise<SprintOutput> {
    return this.projectAgile.sprint.getSprint(sprintId);
  }

  /**
   * Создает новый спринт
   * @param input - данные для создания спринта
   * @returns созданный спринт
   */
  async createSprint(input: CreateSprintDto): Promise<SprintOutput> {
    return this.projectAgile.sprint.createSprint(input);
  }

  /**
   * Обновляет спринт
   * @param sprintId - идентификатор спринта
   * @param input - данные для обновления
   * @returns обновленный спринт
   */
  async updateSprint(
    sprintId: string,
    input: Omit<UpdateSprintDto, 'sprintId'>
  ): Promise<SprintOutput> {
    return this.projectAgile.sprint.updateSprint(sprintId, input);
  }
}
